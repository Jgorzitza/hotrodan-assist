import os
import re, sys
from urllib.parse import urljoin
import requests
from requests import exceptions as req_exc
from xml.etree import ElementTree as ET

BASE = "https://hotrodan.com"
SITEMAP_CANDIDATES = [
    "/sitemap.xml",
    "/sitemap_index.xml",
    "/sitemap/sitemap.xml",
]

# Keep
ALLOW_PATTERNS = [
    r"^https?://[^/]+/blogs/",          # blog posts
    r"^https?://[^/]+/products/",       # products
    r"^https?://[^/]+/pages/",          # pages (often includes help center articles)
    r"^https?://[^/]+/collections/",    # collections
    r"^https?://[^/]+/(help|support)/", # explicit help/support sections
    r"^https?://[^/]+/faqs?/",          # FAQ routes
]

# Drop
BLOCK_PATTERNS = [
    r"\?(?:.*(?:variant|utm|ref|gclid|yclid|fbclid|filter)=)",  # junky params / filtered dupes
    r"/cart", r"/checkout", r"/account", r"/admin", r"/policies",
    r"/cdn/", r"\.json$", r"/apps/",
]

USER_AGENT = "HRAN-crawler/1.0"


def _env_flag(name: str) -> bool:
    value = os.getenv(name, "").strip().lower()
    return value in {"1", "true", "yes", "on"}


def _build_session(disable_proxies: bool) -> requests.Session:
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    if disable_proxies:
        session.trust_env = False
    return session


_DISABLE_PROXIES = _env_flag("DISCOVER_URLS_DISABLE_PROXIES")
_SESSION_WITH_PROXIES = _build_session(False)
_SESSION_NO_PROXY = _build_session(True)


def _should_retry_without_proxy(exc: Exception) -> bool:
    if isinstance(exc, req_exc.ProxyError):
        return True
    if isinstance(exc, req_exc.HTTPError):
        if exc.response is not None and exc.response.status_code == 403:
            text = "" if exc.response is None else exc.response.text
            if "Tunnel connection failed" in str(exc) or "Tunnel connection failed" in text:
                return True
    return False


def _request(url: str, timeout: int, disable_proxies: bool) -> requests.Response:
    session = _SESSION_NO_PROXY if disable_proxies else _SESSION_WITH_PROXIES
    proxies = {"http": "", "https": ""} if disable_proxies else None
    response = session.get(url, timeout=timeout, allow_redirects=True, proxies=proxies)
    response.raise_for_status()
    return response


def fetch(url, timeout=20):
    try:
        return _request(url, timeout, disable_proxies=_DISABLE_PROXIES)
    except req_exc.RequestException as exc:
        if not _DISABLE_PROXIES and _should_retry_without_proxy(exc):
            print(f"Retrying {url} without proxies due to {exc.__class__.__name__} ...")
            return _request(url, timeout, disable_proxies=True)
        raise

def find_sitemaps():
    good = []
    errors = []
    for path in SITEMAP_CANDIDATES:
        url = urljoin(BASE, path)
        try:
            r = fetch(url, 10)
            if r.status_code == 200 and r.text.strip().startswith("<?xml"):
                good.append(url)
        except req_exc.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else "?"
            errors.append(f"{url} → HTTP {status}")
        except req_exc.RequestException as exc:
            errors.append(f"{url} → {exc.__class__.__name__}: {exc}")
        except Exception as exc:  # pragma: no cover - defensive catch-all
            errors.append(f"{url} → {exc.__class__.__name__}: {exc}")
    if not good and errors:
        print("Checked sitemap candidates but none succeeded:")
        for msg in errors[:3]:
            print(f" - {msg}")
        if len(errors) > 3:
            print(f" - … {len(errors) - 3} more similar errors suppressed")
    return good

def parse_sitemap(url):
    urls = []
    xml = fetch(url).text
    root = ET.fromstring(xml)
    ns = {"sm":"http://www.sitemaps.org/schemas/sitemap/0.9"}
    for sm in root.findall("sm:sitemap", ns):
        loc = sm.findtext("sm:loc", namespaces=ns)
        if loc:
            urls.extend(parse_sitemap(loc))
    for u in root.findall("sm:url", ns):
        loc = u.findtext("sm:loc", namespaces=ns)
        lastmod = u.findtext("sm:lastmod", namespaces=ns) or ""
        if loc:
            urls.append((loc.strip(), lastmod.strip()))
    return urls

def allowed(url):
    for p in BLOCK_PATTERNS:
        if re.search(p, url, flags=re.I):
            return False
    for p in ALLOW_PATTERNS:
        if re.search(p, url, flags=re.I):
            return True
    return False

def main():
    maps = find_sitemaps()
    if not maps:
        print("No sitemap found. Aborting.")
        sys.exit(2)

    seen = {}
    for sm in maps:
        for url, lastmod in parse_sitemap(sm):
            if allowed(url):
                seen[url] = lastmod

    urls = sorted(seen.keys())
    print(f"Discovered {len(urls)} URLs after filtering.")
    with open("urls.txt", "w") as f:
        for u in urls:
            f.write(u + "\n")
    with open("urls_with_lastmod.tsv", "w") as f:
        for u in urls:
            f.write(f"{u}\t{seen[u]}\n")
    print("Wrote urls.txt and urls_with_lastmod.tsv")

if __name__ == "__main__":
    main()

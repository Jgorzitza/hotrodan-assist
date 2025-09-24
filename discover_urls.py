import re, sys
from urllib.parse import urljoin
import requests
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

def fetch(url, timeout=20):
    r = requests.get(url, timeout=timeout, headers={"User-Agent":"HRAN-crawler/1.0"})
    r.raise_for_status()
    return r

def find_sitemaps():
    good = []
    for path in SITEMAP_CANDIDATES:
        url = urljoin(BASE, path)
        try:
            r = fetch(url, 10)
            if r.status_code == 200 and r.text.strip().startswith("<?xml"):
                good.append(url)
        except Exception:
            pass
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

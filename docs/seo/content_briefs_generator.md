# Content Briefs Generator

Generates comprehensive content briefs with entities, headers, FAQs, and SEO insights.

## Usage

```bash
python - <<"PY"
import os, importlib.util, sys
from pathlib import Path
os.environ["SEO_DATA_DIR"] = os.path.abspath("./data/seo")
MODULE_PATH = Path("app/seo-api/content/content_briefs_generator.py").resolve()
spec = importlib.util.spec_from_file_location("content_briefs_generator", str(MODULE_PATH))
cbg = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = cbg
spec.loader.exec_module(cbg)

generator = cbg.ContentBriefsGenerator()
brief = generator.generate_content_brief("SEO Optimization", "search engine optimization")
print(cbg.export_brief(brief, "markdown"))
PY
```

## API
- ContentBriefsGenerator: Main class for generating content briefs
- generate_content_brief(topic, target_keyword, sample_content, content_type, word_count_target) -> ContentBrief
- export_brief(brief, format) -> str (json or markdown)
- extract_entities(text) -> List[Entity]
- generate_header_structure(topic, content_type) -> HeaderStructure
- generate_faqs(topic, target_keyword, num_faqs) -> List[FAQ]

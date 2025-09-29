#!/bin/bash
cd ~/llama_rag
source .venv/bin/activate
source .env
python3 app/rag_api/main.py

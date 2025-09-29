#!/bin/bash

# Release notes generator for Llama RAG
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[RELEASE]${NC} $1"
}

# Function to get commits since last tag
get_commits_since_last_tag() {
    local last_tag=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
    
    if [ -z "$last_tag" ]; then
        git log --oneline --pretty=format:"%h %s" HEAD
    else
        git log --oneline --pretty=format:"%h %s" "${last_tag}..HEAD"
    fi
}

# Function to categorize commits
categorize_commits() {
    local commits="$1"
    
    echo "$commits" | while IFS= read -r commit; do
        if [[ $commit =~ ^[a-f0-9]+ ]]; then
            local hash=$(echo "$commit" | cut -d' ' -f1)
            local message=$(echo "$commit" | cut -d' ' -f2-)
            
            # Categorize based on conventional commit format
            if [[ $message =~ ^feat(\(.+\))?: ]]; then
                echo "FEATURE: $message"
            elif [[ $message =~ ^fix(\(.+\))?: ]]; then
                echo "BUGFIX: $message"
            elif [[ $message =~ ^docs(\(.+\))?: ]]; then
                echo "DOCS: $message"
            elif [[ $message =~ ^style(\(.+\))?: ]]; then
                echo "STYLE: $message"
            elif [[ $message =~ ^refactor(\(.+\))?: ]]; then
                echo "REFACTOR: $message"
            elif [[ $message =~ ^perf(\(.+\))?: ]]; then
                echo "PERFORMANCE: $message"
            elif [[ $message =~ ^test(\(.+\))?: ]]; then
                echo "TEST: $message"
            elif [[ $message =~ ^chore(\(.+\))?: ]]; then
                echo "CHORE: $message"
            elif [[ $message =~ ^build(\(.+\))?: ]]; then
                echo "BUILD: $message"
            elif [[ $message =~ ^ci(\(.+\))?: ]]; then
                echo "CI: $message"
            else
                echo "OTHER: $message"
            fi
        fi
    done
}

# Function to generate release notes
generate_release_notes() {
    local version=$1
    local date=$(date +%Y-%m-%d)
    
    print_status "Generating release notes for version $version"
    
    # Get commits since last tag
    local commits=$(get_commits_since_last_tag)
    
    # Categorize commits
    local categorized_commits=$(categorize_commits "$commits")
    
    # Generate release notes
    cat > "RELEASE_NOTES_${version}.md" << RELEASE_NOTES_EOF
# Release Notes - v$version

**Release Date:** $date

## What's New

### 🚀 Features
$(echo "$categorized_commits" | grep "^FEATURE:" | sed 's/^FEATURE: /- /' | sed 's/^/- /')

### 🐛 Bug Fixes
$(echo "$categorized_commits" | grep "^BUGFIX:" | sed 's/^BUGFIX: /- /' | sed 's/^/- /')

### 📚 Documentation
$(echo "$categorized_commits" | grep "^DOCS:" | sed 's/^DOCS: /- /' | sed 's/^/- /')

### 🎨 Styling
$(echo "$categorized_commits" | grep "^STYLE:" | sed 's/^STYLE: /- /' | sed 's/^/- /')

### 🔧 Refactoring
$(echo "$categorized_commits" | grep "^REFACTOR:" | sed 's/^REFACTOR: /- /' | sed 's/^/- /')

### ⚡ Performance
$(echo "$categorized_commits" | grep "^PERFORMANCE:" | sed 's/^PERFORMANCE: /- /' | sed 's/^/- /')

### 🧪 Tests
$(echo "$categorized_commits" | grep "^TEST:" | sed 's/^TEST: /- /' | sed 's/^/- /')

### 🔨 Build & CI
$(echo "$categorized_commits" | grep -E "^(BUILD|CI):" | sed 's/^[^:]*: /- /' | sed 's/^/- /')

### 🛠️ Maintenance
$(echo "$categorized_commits" | grep "^CHORE:" | sed 's/^CHORE: /- /' | sed 's/^/- /')

## Breaking Changes
<!-- List any breaking changes here -->

## Migration Guide
<!-- Add migration instructions if needed -->

## Contributors
<!-- List contributors for this release -->

## Full Changelog
\`\`\`
$commits
\`\`\`
RELEASE_NOTES_EOF

    print_status "Release notes generated: RELEASE_NOTES_${version}.md"
}

# Function to create GitHub release
create_github_release() {
    local version=$1
    local release_notes_file="RELEASE_NOTES_${version}.md"
    
    print_status "Creating GitHub release for v$version"
    
    # Check if gh CLI is available
    if ! command -v gh &> /dev/null; then
        print_warning "GitHub CLI (gh) not found. Skipping GitHub release creation."
        return
    fi
    
    # Create release
    gh release create "v$version" \
        --title "Release v$version" \
        --notes-file "$release_notes_file" \
        --latest
    
    print_status "GitHub release created"
}

# Main function
main() {
    local version=${1:-$(git describe --tags --abbrev=0 2>/dev/null || echo "1.0.0")}
    
    print_header "Generating release notes for version $version"
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository"
        exit 1
    fi
    
    # Generate release notes
    generate_release_notes $version
    
    # Ask if user wants to create GitHub release
    read -p "Do you want to create a GitHub release? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_github_release $version
    else
        print_status "Skipping GitHub release creation"
    fi
    
    print_header "Release notes generation completed!"
    print_status "Release notes: RELEASE_NOTES_${version}.md"
}

# Run main function with arguments
main "$@"

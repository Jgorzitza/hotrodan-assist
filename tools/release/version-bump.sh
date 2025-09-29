#!/bin/bash

# Version bump script for Llama RAG monorepo
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

# Function to get current version
get_current_version() {
    node -p "require('./package.json').version"
}

# Function to bump version
bump_version() {
    local version_type=$1
    print_status "Bumping version: $version_type"
    
    case $version_type in
        "major")
            npm version major --no-git-tag-version
            ;;
        "minor")
            npm version minor --no-git-tag-version
            ;;
        "patch")
            npm version patch --no-git-tag-version
            ;;
        "prerelease")
            npm version prerelease --preid=beta --no-git-tag-version
            ;;
        *)
            print_error "Invalid version type. Use: major, minor, patch, prerelease"
            exit 1
            ;;
    esac
}

# Function to update package versions
update_package_versions() {
    local new_version=$1
    print_status "Updating package versions to $new_version"
    
    # Update all package.json files in packages/
    find packages -name "package.json" -exec sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$new_version\"/g" {} \;
    
    # Update all package.json files in apps/
    find apps -name "package.json" -exec sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$new_version\"/g" {} \;
    
    print_status "All package versions updated to $new_version"
}

# Function to generate changelog
generate_changelog() {
    print_status "Generating changelog..."
    
    # Check if standard-version is available
    if command -v standard-version &> /dev/null; then
        standard-version --release-as $(get_current_version)
    else
        print_warning "standard-version not found, using git log for changelog"
        generate_git_changelog
    fi
}

# Function to generate changelog from git log
generate_git_changelog() {
    local current_version=$(get_current_version)
    local previous_tag=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
    
    print_status "Generating changelog from git log..."
    
    cat > CHANGELOG.md << CHANGELOG_EOF
# Changelog

All notable changes to this project will be documented in this file.

## [$current_version] - $(date +%Y-%m-%d)

### Added
- Initial release

### Changed
- Project setup and configuration

### Fixed
- Various bug fixes and improvements

CHANGELOG_EOF

    print_status "Changelog generated"
}

# Function to commit changes
commit_changes() {
    local version=$1
    print_status "Committing version $version changes..."
    
    git add .
    git commit -m "chore(release): v$version

- Bump version to $version
- Update all package versions
- Generate changelog

[skip ci]"
    
    print_status "Changes committed"
}

# Function to create git tag
create_tag() {
    local version=$1
    print_status "Creating git tag v$version..."
    
    git tag -a "v$version" -m "Release version $version"
    
    print_status "Git tag v$version created"
}

# Function to publish packages
publish_packages() {
    local version=$1
    print_status "Publishing packages..."
    
    # Publish packages
    cd packages/core && npm publish --access public
    cd ../api-client && npm publish --access public
    cd ../graphql-types && npm publish --access public
    cd ../ui-components && npm publish --access public
    cd ../..
    
    print_status "Packages published"
}

# Main function
main() {
    local version_type=${1:-patch}
    
    print_header "Starting version bump process"
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository"
        exit 1
    fi
    
    # Check if working directory is clean
    if ! git diff-index --quiet HEAD --; then
        print_error "Working directory is not clean. Please commit or stash changes."
        exit 1
    fi
    
    # Get current version
    local current_version=$(get_current_version)
    print_status "Current version: $current_version"
    
    # Bump version
    bump_version $version_type
    
    # Get new version
    local new_version=$(get_current_version)
    print_status "New version: $new_version"
    
    # Update package versions
    update_package_versions $new_version
    
    # Generate changelog
    generate_changelog
    
    # Commit changes
    commit_changes $new_version
    
    # Create tag
    create_tag $new_version
    
    print_header "Version bump completed successfully!"
    print_status "Version: $new_version"
    print_status "Tag: v$new_version"
    print_warning "Remember to push changes and tags:"
    print_warning "  git push origin main"
    print_warning "  git push origin v$new_version"
    
    # Ask if user wants to publish
    read -p "Do you want to publish packages to npm? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        publish_packages $new_version
    else
        print_status "Skipping package publishing"
    fi
}

# Run main function with arguments
main "$@"

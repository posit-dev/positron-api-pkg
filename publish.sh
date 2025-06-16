#!/bin/bash

# Publish script for @posit-dev/positron-types
# This script handles versioning, building, and publishing the package

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$SCRIPT_DIR"

# Parse command line arguments
VERSION_TYPE=""
NON_INTERACTIVE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --non-interactive|-y)
            NON_INTERACTIVE=true
            shift
            ;;
        --dry-run|-d)
            DRY_RUN=true
            shift
            ;;
        patch|minor|major|prerelease)
            if [[ -z "$VERSION_TYPE" ]]; then
                VERSION_TYPE="$1"
            else
                echo -e "${RED}❌ Error: Multiple version types specified${NC}"
                exit 1
            fi
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [patch|minor|major|prerelease] [--non-interactive|-y] [--dry-run|-d]"
            echo ""
            echo "Arguments:"
            echo "  patch|minor|major|prerelease  Version bump type (default: patch)"
            echo ""
            echo "Options:"
            echo "  --non-interactive, -y         Skip confirmation prompts"
            echo "  --dry-run, -d                 Test run - skip npm publish and git operations"
            echo "  --help, -h                   Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Error: Unknown argument '$1'${NC}"
            echo "Usage: $0 [patch|minor|major|prerelease] [--non-interactive|-y] [--dry-run|-d]"
            exit 1
            ;;
    esac
done

# Set default version type if not specified
VERSION_TYPE="${VERSION_TYPE:-patch}"

if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${BLUE}🧪 Dry Run - Testing @posit-dev/positron publish script${NC}"
    echo "====================================================="
else
    echo -e "${BLUE}🚀 Publishing @posit-dev/positron${NC}"
    echo "========================================"
fi

# Check if we're in a git repository and on the right branch
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    exit 1
fi

# Check if the adjacent positron repository is up to date
POSITRON_REPO="../positron"
if [[ -d "$POSITRON_REPO" ]]; then
    echo -e "${BLUE}🔍 Checking Positron repository status...${NC}"
    
    # Save current directory
    CURRENT_DIR=$(pwd)
    cd "$POSITRON_REPO"
    
    # Verify this is actually the positron repository by checking git remote
    if git remote -v &>/dev/null; then
        ORIGIN_FETCH=$(git remote get-url origin 2>/dev/null || echo "")
        ORIGIN_PUSH=$(git remote get-url --push origin 2>/dev/null || echo "")
        EXPECTED_URL="git@github.com:posit-dev/positron.git"
        
        if [[ "$ORIGIN_FETCH" != "$EXPECTED_URL" ]] || [[ "$ORIGIN_PUSH" != "$EXPECTED_URL" ]]; then
            echo -e "${YELLOW}⚠️  Warning: Directory at $POSITRON_REPO doesn't appear to be the Positron repository${NC}"
            echo -e "${YELLOW}   Expected remote: $EXPECTED_URL${NC}"
            echo -e "${YELLOW}   Found fetch URL: $ORIGIN_FETCH${NC}"
            echo -e "${YELLOW}   Found push URL:  $ORIGIN_PUSH${NC}"
            cd "$CURRENT_DIR"
            
            if [[ "$NON_INTERACTIVE" == "false" ]]; then
                read -p "Do you want to continue anyway? (y/N): " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    echo -e "${RED}❌ Aborted${NC}"
                    exit 1
                fi
            else
                echo -e "${BLUE}🤖 Non-interactive mode: continuing despite repository mismatch${NC}"
            fi
        else
            # Fetch latest from remote
            git fetch origin main &>/dev/null
            
            # Check if main branch exists and is behind origin/main
            if git rev-parse --verify main &>/dev/null; then
                LOCAL_MAIN=$(git rev-parse main)
                REMOTE_MAIN=$(git rev-parse origin/main)
                
                if [[ "$LOCAL_MAIN" != "$REMOTE_MAIN" ]]; then
                    # Check if local is behind
                    BEHIND_COUNT=$(git rev-list --count main..origin/main)
                    if [[ "$BEHIND_COUNT" -gt 0 ]]; then
                        echo -e "${YELLOW}⚠️  Warning: Positron repository is $BEHIND_COUNT commits behind origin/main${NC}"
                        echo -e "${YELLOW}   Path: $POSITRON_REPO${NC}"
                        
                        if [[ "$NON_INTERACTIVE" == "false" ]]; then
                            read -p "Do you want to continue anyway? (y/N): " -n 1 -r
                            echo
                            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                                echo -e "${RED}❌ Aborted${NC}"
                                cd "$CURRENT_DIR"
                                exit 1
                            fi
                        else
                            echo -e "${BLUE}🤖 Non-interactive mode: continuing despite Positron being behind${NC}"
                        fi
                    fi
                else
                    echo -e "${GREEN}✅ Positron repository is up to date with origin/main${NC}"
                fi
            else
                echo -e "${YELLOW}⚠️  Warning: Could not check Positron repository main branch${NC}"
            fi
            
            # Return to package directory
            cd "$CURRENT_DIR"
        fi
    else
        echo -e "${YELLOW}⚠️  Warning: Not a git repository at $POSITRON_REPO${NC}"
        cd "$CURRENT_DIR"
    fi
else
    echo -e "${YELLOW}⚠️  Warning: Positron repository not found at $POSITRON_REPO${NC}"
    if [[ "$NON_INTERACTIVE" == "false" ]]; then
        read -p "Do you want to continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}❌ Aborted${NC}"
            exit 1
        fi
    else
        echo -e "${BLUE}🤖 Non-interactive mode: continuing without Positron repository check${NC}"
    fi
fi

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
    if [[ "$NON_INTERACTIVE" == "false" ]]; then
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}❌ Aborted${NC}"
            exit 1
        fi
    else
        echo -e "${BLUE}🤖 Non-interactive mode: continuing with uncommitted changes${NC}"
    fi
fi

# Change to package directory
cd "$PACKAGE_DIR"

if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major|prerelease)$ ]]; then
    echo -e "${RED}❌ Error: Invalid version type '$VERSION_TYPE'${NC}"
    echo "Usage: $0 [patch|minor|major|prerelease] [--non-interactive|-y]"
    exit 1
fi

echo -e "${BLUE}📋 Pre-publish checklist:${NC}"

# Step 1: Build the package (includes type generation)
echo -e "${BLUE}1. Building package...${NC}"
cd "$PACKAGE_DIR"
npm run build
if [[ $? -ne 0 ]]; then
    echo -e "${RED}❌ Failed to build package${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Package built successfully${NC}"

# Function to extract Positron version from product.json
get_positron_version() {
    local positron_product_json="$POSITRON_REPO/product.json"
    if [[ -f "$positron_product_json" ]]; then
        node -p "try { require('$positron_product_json').positronVersion } catch(e) { '' }" 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# Function to update README compatibility table
update_readme_compatibility() {
    local positron_version="$1"
    local package_version="$2"
    
    if [[ -f "README.md" ]]; then
        # Use sed to update the table row with the new Positron version and exact package version
        # This matches the current pattern and replaces the version columns, including the new Notes column
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS version
            sed -i '' "s/| [0-9]\{1,2\}\.[0-9]\{1,2\}\.[0-9x]*[[:space:]]*| [0-9]\{4\}\.[0-9]\{1,2\}\.[0-9x+]*[[:space:]]*| 1\.74\.0+[[:space:]]*|[[:space:]]*|/| $package_version               | $positron_version+        | 1.74.0+     |       |/" README.md
        else
            # Linux version
            sed -i "s/| [0-9]\{1,2\}\.[0-9]\{1,2\}\.[0-9x]*[[:space:]]*| [0-9]\{4\}\.[0-9]\{1,2\}\.[0-9x+]*[[:space:]]*| 1\.74\.0+[[:space:]]*|[[:space:]]*|/| $package_version               | $positron_version+        | 1.74.0+     |       |/" README.md
        fi
        
        if [[ $? -eq 0 ]]; then
            echo -e "${GREEN}✅ Updated README compatibility table${NC}"
        else
            echo -e "${YELLOW}⚠️  Warning: Could not update README compatibility table${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Warning: README.md not found${NC}"
    fi
}

# Step 2: Check and update Positron version compatibility
echo -e "${BLUE}2. Checking Positron version compatibility...${NC}"

# Try to get the current Positron version
DETECTED_POSITRON_VERSION=$(get_positron_version)

if [[ -n "$DETECTED_POSITRON_VERSION" ]]; then
    echo -e "${GREEN}   Detected Positron version: ${YELLOW}$DETECTED_POSITRON_VERSION${NC}"
    
    if [[ "$NON_INTERACTIVE" == "false" ]]; then
        echo -e "${BLUE}   This will be used to update the README compatibility table.${NC}"
        read -p "   Is this the correct Positron version to use? (Y/n): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            read -p "   Enter the correct Positron version (e.g., 2025.6.x): " POSITRON_VERSION
            POSITRON_VERSION="${POSITRON_VERSION:-$DETECTED_POSITRON_VERSION}"
        else
            POSITRON_VERSION="$DETECTED_POSITRON_VERSION"
        fi
    else
        POSITRON_VERSION="$DETECTED_POSITRON_VERSION"
        echo -e "${BLUE}🤖 Non-interactive mode: using detected version $POSITRON_VERSION${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Could not detect Positron version from $POSITRON_REPO/product.json${NC}"
    
    if [[ "$NON_INTERACTIVE" == "false" ]]; then
        read -p "   Enter the current Positron version (e.g., 2025.6.x): " POSITRON_VERSION
        
        if [[ -z "$POSITRON_VERSION" ]]; then
            echo -e "${YELLOW}⚠️  No Positron version provided, skipping README update${NC}"
        fi
    else
        echo -e "${BLUE}🤖 Non-interactive mode: skipping README update${NC}"
        POSITRON_VERSION=""
    fi
fi

# Update README if we have a version
if [[ -n "$POSITRON_VERSION" ]]; then
    echo -e "${BLUE}   Updating README compatibility table with version $POSITRON_VERSION...${NC}"
    # We need to get the NEW version after the bump, so we'll call this after version update
    TEMP_POSITRON_VERSION="$POSITRON_VERSION"
fi

# Step 3: Show current version and ask for confirmation
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}3. Current version: ${YELLOW}v$CURRENT_VERSION${NC}"

# Calculate what the new version will be
echo -e "${BLUE}   Bumping $VERSION_TYPE version...${NC}"

# Step 4: Version bump
echo -e "${BLUE}4. Updating version...${NC}"
npm version "$VERSION_TYPE" --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}✅ Version updated to v$NEW_VERSION${NC}"

# Now update README with the new package version if we have a Positron version
if [[ -n "$TEMP_POSITRON_VERSION" ]]; then
    echo -e "${BLUE}   Updating README compatibility table with package v$NEW_VERSION and Positron $TEMP_POSITRON_VERSION...${NC}"
    update_readme_compatibility "$TEMP_POSITRON_VERSION" "$NEW_VERSION"
fi

# Step 5: Final confirmation and publishing
if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${YELLOW}🧪 Dry run complete - Ready to publish v$NEW_VERSION${NC}"
    echo -e "${BLUE}💡 In a real run, the following would happen:${NC}"
    echo -e "${BLUE}   - npm publish${NC}"
    echo -e "${BLUE}   - git tag v$NEW_VERSION${NC}"
    echo -e "${BLUE}   - git push origin v$NEW_VERSION${NC}"
    echo -e "${BLUE}💡 Your changes (version bump and README update) have been made and can be reverted with git.${NC}"
else
    echo -e "${YELLOW}📦 Ready to publish v$NEW_VERSION${NC}"
    if [[ "$NON_INTERACTIVE" == "false" ]]; then
        read -p "Do you want to publish to npm? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}⚠️  Version was updated but not published${NC}"
            echo -e "${BLUE}💡 To publish later, run: npm publish${NC}"
            exit 0
        fi
    else
        echo -e "${BLUE}🤖 Non-interactive mode: proceeding with publish${NC}"
    fi

    # Step 6: Publish to npm
    echo -e "${BLUE}6. Publishing to npm...${NC}"
    npm publish

    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}🎉 Successfully published @posit-dev/positron@$NEW_VERSION${NC}"
        
        # Step 7: Create and push git tag
        echo -e "${BLUE}7. Creating git tag...${NC}"
        TAG_NAME="v$NEW_VERSION"
        
        # Create the tag
        git tag -a "$TAG_NAME" -m "Release $TAG_NAME"
        
        if [[ $? -eq 0 ]]; then
            echo -e "${GREEN}✅ Created tag $TAG_NAME${NC}"
            
            # Push the tag to origin
            echo -e "${BLUE}   Pushing tag to GitHub...${NC}"
            git push origin "$TAG_NAME"
            
            if [[ $? -eq 0 ]]; then
                echo -e "${GREEN}✅ Pushed tag $TAG_NAME to GitHub${NC}"
            else
                echo -e "${YELLOW}⚠️  Failed to push tag to GitHub${NC}"
                echo -e "${BLUE}💡 You can push it manually with: git push origin $TAG_NAME${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  Failed to create git tag${NC}"
        fi
        
        echo -e "${BLUE}💡 Remember to commit and push your changes!${NC}"
    else
        echo -e "${RED}❌ Failed to publish to npm${NC}"
        exit 1
    fi
fi

echo
if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${GREEN}🎊 Dry run completed successfully!${NC}"
    echo -e "${BLUE}💡 To revert changes: git checkout -- package.json README.md${NC}"
else
    echo -e "${GREEN}🎊 All done! Package published successfully.${NC}"
    echo -e "${BLUE}📦 Install with: npm install --save-dev @posit-dev/positron${NC}"
fi

#!/bin/sh

OUTPUT_FILE="index.html"
MAX_DEPTH=16

# --- Base64 Icons (SVGs encoded to Base64 to keep script portable) ---
# Folder Icon (Yellow)
ICON_FOLDER="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmY2EyOCI+PHBhdGggZD0iTTEwIDRINmwtMiAydjE0aDE2VjhoLThsLTItMnoiLz48L3N2Zz4="
# HTML Icon (Orange)
ICON_HTML="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2U0NGQyNiI+PHBhdGggZD0iTTEyIDJMNiAzbDEgMTggNSAyIDUgLTItMS0xOHptMCAxNmw0LTEuNSAxLTMuNWgtMi41bC0uMyAxLjVIMTJsLS41IDItMiAuNS41IDN6Ii8+PC9zdmc+"
# File Icon (Gray)
ICON_FILE="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzc3NyI+PHBhdGggZD0iTTE0IDJINmwtMiAydjE2bDIgMmgxMmwyLTJWM2wtNS0xeiBtLTEgN1YzLjVsNC41IDR6Ii8+PC9zdmc+"

# --- HTML Header ---
cat <<EOF > "$OUTPUT_FILE"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Directory</title>
    <style>
        :root { --bg: #f8f9fa; --card: #ffffff; --text: #333; --border: #dee2e6; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); padding: 40px; max-width: 900px; margin: 0 auto; }
        h1 { border-bottom: 2px solid var(--border); padding-bottom: 10px; }
        ul { list-style: none; padding-left: 20px; border-left: 1px solid #e9ecef; }
        li { margin: 8px 0; display: flex; flex-direction: column; }
        .row { display: flex; align-items: center; gap: 8px; }
        .icon { width: 20px; height: 20px; vertical-align: middle; }
        a { text-decoration: none; color: #007bff; font-weight: 500; }
        a:hover { text-decoration: underline; }
        .meta { font-size: 0.85em; color: #6c757d; margin-left: 10px; }
        
        /* Buttons */
        .btn-group { display: inline-flex; gap: 5px; margin-left: 10px; }
        .btn { font-size: 0.75em; padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border); background: #fff; color: #333; text-decoration: none; }
        .btn:hover { background: #e9ecef; text-decoration: none; }
        .btn-primary { background: #007bff; color: white; border-color: #007bff; }
        .btn-primary:hover { background: #0056b3; }
        
        /* Utility */
        .dim { color: #999; }
    </style>
</head>
<body>
    <h1>📂 Project Index</h1>
    <p class="dim">Generated automatically by git hooks.</p>
    <ul>
EOF

# --- Recursive Function to Walk Tree ---
# --- Recursive Function to Walk Tree ---
walk_tree() {
    current_dir="$1"
    depth="$2"

    # Stop if recursion limit reached
    if [ "$depth" -gt "$MAX_DEPTH" ]; then return; fi

    # We need to list all contents of the current directory, excluding the '.' and '..' pseudo-directories.
    
    # 1. Process Directories (must be first to keep them at the top of the list)
    # We use 'find' in this section for better control over the paths, ensuring we only get immediate children.
    find "$current_dir" -maxdepth 1 -mindepth 1 -type d | sort | while read -r path; do
        
        dirname=$(basename "$path")
        
        # Ignored folders
        case "$dirname" in
            .git|node_modules|dist|build|venv|__pycache__) continue ;;
        esac

        # Check for nested index.html
        has_index=0
        if [ -f "$path/index.html" ]; then has_index=1; fi

        # Write Directory Entry
        echo "<li>" >> "$OUTPUT_FILE"
        echo "  <div class='row'>" >> "$OUTPUT_FILE"
        echo "    <img src='$ICON_FOLDER' class='icon' alt='dir'>" >> "$OUTPUT_FILE"
        
        # Logic for folder buttons
        if [ "$has_index" -eq 1 ]; then
            # If index exists: Link 1 (Open App/Index), Link 2 (Just text indicating contents are below)
            clean_path="${path#./}"
            echo "    <span>$dirname</span>" >> "$OUTPUT_FILE"
            echo "    <div class='btn-group'>" >> "$OUTPUT_FILE"
            echo "      <a href='$clean_path/' class='btn btn-primary'>🚀 Launch</a>" >> "$OUTPUT_FILE"
            echo "      <span class='btn dim'>Contents below &darr;</span>" >> "$OUTPUT_FILE"
            echo "    </div>" >> "$OUTPUT_FILE"
        else
            # Standard folder
            echo "    <strong>$dirname</strong>" >> "$OUTPUT_FILE"
        fi
        echo "  </div>" >> "$OUTPUT_FILE"

        # Recurse
        echo "  <ul>" >> "$OUTPUT_FILE"
        walk_tree "$path" $((depth + 1))
        echo "  </ul>" >> "$OUTPUT_FILE"
        echo "</li>" >> "$OUTPUT_FILE"
    done


    # 2. Process Files
    # We use 'find' again to list files directly under current_dir
    find "$current_dir" -maxdepth 1 -mindepth 1 -type f | sort | while read -r path; do
        
        filename=$(basename "$path")
        
        # Ignored files
        [ "$filename" = "$OUTPUT_FILE" ] && continue
        [ "$filename" = ".DS_Store" ] && continue
        case "$filename" in
            .git*) continue ;;
        esac

        # Determine Icon
        case "$filename" in
            *.html) icon="$ICON_HTML" ;;
            *)      icon="$ICON_FILE" ;;
        esac

        clean_path="${path#./}"
        
        echo "<li>" >> "$OUTPUT_FILE"
        echo "  <div class='row'>" >> "$OUTPUT_FILE"
        echo "    <img src='$icon' class='icon' alt='file'>" >> "$OUTPUT_FILE"
        echo "    <a href='$clean_path'>$filename</a>" >> "$OUTPUT_FILE"
        echo "  </div>" >> "$OUTPUT_FILE"
        echo "</li>" >> "$OUTPUT_FILE"
    done
}

# Start recursion from current directory (.) with depth 1
walk_tree "." 1

# --- HTML Footer ---
cat <<EOF >> "$OUTPUT_FILE"
    </ul>
</body>
</html>
EOF

# --- STAGING & EXIT FIX USING GIT UPDATE-INDEX ---

# Check if the output file was successfully created
if [ -f "$OUTPUT_FILE" ]; then
    # 1. Ensure file permissions are standard
    chmod 644 "$OUTPUT_FILE"

    # 2. Get the file size and content hash (mode 100644 is standard file)
    FILE_SHA=$(git hash-object -w "$OUTPUT_FILE")

    # 3. Use the low-level command to forcibly stage the content hash to the index
    # This is the most reliable way to stage generated files in pre-commit.
    git update-index --add --replace --cacheinfo 100644 $FILE_SHA "$OUTPUT_FILE"
    
    echo "✅ Successfully generated and staged $OUTPUT_FILE using git update-index."
    
    exit 0
else
    echo "❌ Error: $OUTPUT_FILE was not created. Aborting commit."
    exit 1 # Non-zero exit code aborts the commit
fi

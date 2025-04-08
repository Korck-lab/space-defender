import re
import os
import sys


def extract_and_create_files(text_content, base_dir="."):
    """
    Parses text content to find file paths and code blocks,
    then creates/updates those files relative to the base_dir.

    Args:
        text_content (str): The full text containing file definitions.
        base_dir (str): The root directory where files should be created.
    """
    print(f"[*] Starting file extraction and creation in: {os.path.abspath(base_dir)}")

    # Regex to find file path headings like **1. `js/config.js` (...**
    # Allows for variations in bolding, spacing, numbering. Captures filepath.
    # Uses negative lookahead to avoid matching the structure diagram ```
    heading_pattern = re.compile(
        r"^\s*\**?\s*(?:\d+\.|[-*])\s*`(?P<filepath>[^`]+)`\s*\(?(?!```).*\)?\**?\s*$",
        re.MULTILINE,
    )

    # Regex to find the next markdown code block
    # Captures optional language hint and the code content
    code_block_pattern = re.compile(r"```(?P<lang>\w*)\n(?P<code>.*?)\n```", re.DOTALL)

    last_heading_end = 0
    processed_files = set()

    for heading_match in heading_pattern.finditer(text_content):
        filepath_raw = heading_match.group("filepath").strip()
        # Normalize path separators for the current OS
        filepath = os.path.normpath(filepath_raw)
        heading_start, heading_end = heading_match.span()

        # Define the search area for the code block and "no changes" text
        # It's between the end of the current heading and the start of the *next* heading (or end of text)
        next_heading_match = heading_pattern.search(text_content, heading_end)
        search_end = (
            next_heading_match.start() if next_heading_match else len(text_content)
        )
        search_area = text_content[heading_end:search_end]

        # 1. Check for "no changes needed" within this section
        if re.search(r"no changes needed", search_area, re.IGNORECASE):
            print(f"[.] Skipping file (no changes detected): {filepath}")
            processed_files.add(filepath)
            last_heading_end = heading_end  # Continue search from end of this heading
            continue

        # 2. Find the first code block within the search area
        code_match = code_block_pattern.search(search_area)

        if not code_match:
            # Check if it might be a simple file reference without a code block *intended* for creation
            if (
                filepath not in processed_files
            ):  # Only warn if not already skipped/processed
                # Heuristic: If the file path looks like a code file and wasn't skipped, warn.
                if any(
                    filepath.endswith(ext)
                    for ext in [".js", ".css", ".html", ".py", ".json"]
                ):
                    print(
                        f"[-] Warning: No code block found for potential file: {filepath}"
                    )
            last_heading_end = heading_end
            continue  # Move to next heading

        # Found a code block for this file path
        code_content = code_match.group("code").strip()
        # Mark as processed to avoid duplicate warnings/actions
        processed_files.add(filepath)

        # Construct full path relative to base_dir
        full_path = os.path.join(base_dir, filepath)
        dir_name = os.path.dirname(full_path)

        try:
            # Create directories if they don't exist
            if dir_name:
                os.makedirs(dir_name, exist_ok=True)
                # print(f"[*] Ensured directory exists: {dir_name}") # Optional verbose logging

            # Write the file (update/create)
            # Handle potential newline inconsistencies in source text vs desired output
            # Split lines and rejoin seems safest
            lines = code_content.splitlines()
            cleaned_code_content = "\n".join(
                lines
            )  # Use OS default newline (\n usually works)

            with open(full_path, "w", encoding="utf-8") as f:
                f.write(cleaned_code_content + "\n")  # Add trailing newline
            print(f"[+] Created/Updated file: {full_path}")

        except OSError as e:
            print(f"[!] Error creating/writing file {full_path}: {e}")
        except Exception as e:
            print(f"[!] An unexpected error occurred for file {full_path}: {e}")

        # Update position for next search if needed (finditer handles the main loop)
        last_heading_end = heading_end

    print("[*] File processing complete.")


# --- Main Execution ---
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python update_project_files.py <path_to_input_text_file>")
        print("Example: python update_project_files.py project_update.txt")
        sys.exit(1)

    input_file_path = sys.argv[1]
    # Create files in the same directory as the script, or specify another path
    output_base_dir = os.path.dirname(os.path.abspath(__file__))
    # Alternatively, create in the current working directory from where script is called:
    # output_base_dir = "."

    if not os.path.isfile(input_file_path):
        print(f"[!] Error: Input file not found: {input_file_path}")
        sys.exit(1)

    try:
        print(f"[*] Reading input file: {input_file_path}")
        with open(input_file_path, "r", encoding="utf-8") as f:
            content = f.read()

        extract_and_create_files(content, output_base_dir)

    except FileNotFoundError:
        print(f"[!] Error: Could not find the input file: {input_file_path}")
    except Exception as e:
        print(f"[!] An error occurred during processing: {e}")

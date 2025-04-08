import os
import argparse


def find_files(root_dir, extensions):
    """
    Generator that yields file paths in root_dir (including subdirectories)
    matching any of the provided extensions.
    """
    for current_path, _, files in os.walk(root_dir):
        for file in files:
            if any(file.lower().endswith(ext) for ext in extensions):
                yield os.path.join(current_path, file)


def concatenate_files(root_dir, output_file, extensions):
    """
    Concatenates the contents of all files with the given extensions from root_dir
    and its subdirectories into the specified output_file.
    """
    with open(output_file, "w", encoding="utf-8") as out_f:
        for file_path in find_files(root_dir, extensions):
            out_f.write(f"/* File: {file_path} */\n")
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    out_f.write(content)
            except Exception as e:
                print(f"Error processing {file_path}: {e}")
            out_f.write("\n\n")


def main():
    parser = argparse.ArgumentParser(
        description="Concatenate all CSS, JS, and HTML files in a project folder and its subfolders into one text file."
    )
    parser.add_argument("project_folder", help="Root directory of the project")
    parser.add_argument("output_file", help="Path to the output text file")
    args = parser.parse_args()

    extensions = [".css", ".js", ".html"]
    concatenate_files(args.project_folder, args.output_file, extensions)
    print(f"Concatenation complete. Output saved to {args.output_file}")


if __name__ == "__main__":
    main()

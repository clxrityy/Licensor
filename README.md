# Licensor

A desktop app for managing document templates with variable substitution, rendering, and export capabilities.

<img src=".github/img/example.png" alt="Licensor App Screenshot" width="600" />

---

- [Contributing](.github/CONTRIBUTING.md)
- [GNU GPLv3 License](LICENSE)


Base templates are stored in the [`templates/`](app/templates/) directory as Markdown files with YAML front matter defining the template name, description, and variables. See [example.md](app/templates/example.md) and [commercial.md](app/templates/commercial.md) for reference.

## Examples & References

- [Creating a template](#creating-a-template)
- [Template variables](#template-variables)
- [Searching](#searching)
- [Exporting a document](#exporting-a-document)
- [Documents can have metadata/files](#documents-can-have-metadatafiles)

---

##### Creating a template

- You can create a new template from scratch or clone an existing one.

<img src=".github/img/example_template.gif" alt="Template Creation Gif" width="500" />

##### Template variables

- Can have a type: `text`, `textarea`, `number`, `date`.
- Can be marked as *`required`* or have a **`default`** value.
- These are denoted by double curly braces within the content, e.g., `{{variable_name}}`.

<img src=".github/img/example_vars.png" alt="Template Variables Screenshot" width="400" />

##### Searching

- You can use the search bar to search for templates/documents.
- The search matches against any content within the documents/templates.

<img src=".github/img/example_search.png" alt="Template Search Screenshot" width="400" />

##### Exporting a document

- You can download the rendered document in either `.md` (Markdown) or `.txt` (Plain Text) formats.

<img src=".github/img/example_download.png" alt="Document Export Gif" width="300" />

##### Documents can have metadata/files

- You can add metadata to documents, which is saved alongside the rendered document.
- This can be for organizational purposes or to store additional information.

<img src=".github/img/example_metadata.png" alt="Template Metadata Screenshot" width="400" />

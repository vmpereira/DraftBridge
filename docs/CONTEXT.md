# Domain Glossary & Context

Ubiquitous language and terms for DraftBridge. Use terms exact across codebase.

## Domain Terms

- **Note**: A single Markdown file containing an optional YAML frontmatter header, rich text body, #tags, and [[wiki-links]].
- **Vault / Workspace**: A root directory containing notes and subfolders. Opened in Folder Mode.
- **Frontmatter**: Key-value metadata delimited by --- at note start. Formatted as YAML.
- **Visual Properties Banner**: Form-based header at top of editor. Edits frontmatter without raw YAML code.
- **Wiki-Link**: [[topic]] internal note pointer. Resolves to note file path or flags note creation if missing.
- **Tag**: #keyword categorization token. Bi-directional: typed in note body or configured in frontmatter.
- **Seam**: Boundary where interface lives and behavior alters without editing caller.
- **Adapter**: Concrete implementation filling seam slot (e.g. Electron IPC vs InMemory).
- **Depth**: Leverage at interface. Large behavior behind compact, simple surface.

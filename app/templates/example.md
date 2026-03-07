---
name: "Example Template"
description: "An example template demonstrating variable usage."
variables:
  - name: title
    label: "Document Title"
    type: text
    required: true
  - name: author
    label: "Author Name"
    type: text
    required: true
  - name: date
    label: "Date"
    type: date
    required: true
  - name: content
    label: "Main Content"
    type: textarea
    required: true
---

# {{ title }}

Author: {{ author }}
Date: {{ date }}

## Content

{{ content }}

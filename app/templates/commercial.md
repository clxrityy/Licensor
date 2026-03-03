---
name: "Commercial License Agreement"
description: "Non-exclusive agreement for licensing commercial use of audio content."
variables:
  - name: date
    label: "Effective Date"
    type: date
    required: true
  - name: licensee
    label: "Licensee Name"
    type: text
    required: true
  - name: licensor
    label: "Licensor Name"
    type: text
    required: true
  - name: audio_title
    label: "Audio Content Title"
    type: text
    required: true
  - name: distribution_limit
    label: "Distribution Limit (units)"
    type: number
    default: 10000
  - name: credit
    label: "Credit text"
    type: textarea
    default: "The Licensee is not required to give any credit or attribution to the Licensor for the Audio Content."
  - name: license_fee
    label: "License Fee (USD)"
    type: number
    required: true
  - name: revision_time
    label: "Revision Time (days)"
    type: number
    default: 14
  - name: renewal_term
    label: "Renewal Term (months)"
    type: number
    default: 12
  - name: ID
    label: "License ID"
    type: text
    required: false
---

# COMMERCIAL LICENSE AGREEMENT

THIS LICENSE AGREEMENT is made today on {{ date }} (“Effective Date”) by and between {{ licensee }} (hereinafter referred to as “Licensee”) and {{ licensor }} (hereinafter referred to as the “Licensor”). This agreement grants the Licensee non-exclusive rights to the audio content titled “{{ audio_title }}”.

## Usage

The Licensor hereby grants the Licensee the right to record instrumental and/or audio content synchronization to any or all parts of the audio content. The Licensee and Licensor understand that the non-exclusive usage of the audio content is not limited to any number of composition(s) and if the Licensee wishes to use the audio content in other new compositions, then they are granted to do so. The Licensee also acknowledges they are permitted to edit, program, and alter any and every aspect of the audio content as they wish.

## Profitable Distribution

The Licensee is permitted to distribute the final composition containing the audio content for commercial use, up to a maximum of {{ distribution_limit }} units. The Licensor requires no additional fees or royalties for distribution up to this limit. If the Licensee wishes to distribute more than {{ distribution_limit }} units, they must contact the Licensor to negotiate additional licensing terms and fees.

## Ownership

The Licensor maintains 100% full rights (copyright and ownership) of the audio content, and can continue to sell it non-exclusively. The Licensee has neither the right nor authority to sell or license the rights to the recording whether in whole or part to any other party.

## Credit

{{ credit }}

## Confirmations

Agreed price: {{ license_fee }} USD
License renewlal term: {{ renewal_term }} months
The Licensee has the right to question and request any revision of the terms within {{ revision_time }} days of receiving this contract or the effective date.
License ID: {{ ID }}
The Licensee and Licensor agree upon the terms stated above.

By means of sending or receiving this agreement, the Licensee is granted non-exclusive rights to use the audio content as outlined herein.

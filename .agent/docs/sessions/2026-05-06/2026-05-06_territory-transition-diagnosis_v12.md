# Territory Transition Diagnosis v12

## Overlay correction

The live PVV4 diagnostics overlay was too weak because it only rendered the current topology cleanly.

That meant:
- the destination path was visible
- the source path was mostly invisible
- unchanged local pairs were not clearly distinguishable from active-front movement
- the overlay did not satisfy the requirement to classify every visible boundary section and vertex in a useful way at conquest pause

## Correction

The overlay now renders both topology layers:

- `PRE` source sections:
  - dashed magenta
  - dashed violet for no-motion source pairs
- `NEXT` sections:
  - gray for unchanged
  - muted steel for no-motion local pairs
  - yellow + green sub-span for active front
  - red/orange for real defects

Vertices now also render on both layers:

- `PRE` vertices outlined
- `NEXT` vertices filled
- stable anchors, front anchors, and defect anchors remain distinct

Labels now carry explicit side prefixes:

- `PRE ...`
- `NEXT ...`

## Expected result

At conquest pause, the overlay should now show:

1. where the source boundary came from
2. where the destination boundary goes
3. which local pairs are unchanged but relevant
4. which exact next-section sub-spans are active

This is the required diagnostic surface for judging whether the transition follows the minimum changed frontier.

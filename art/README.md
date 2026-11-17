# Backdrop art

`public/img/hero.webp` (home) and `public/img/dash.webp` (everywhere else) are rendered, not stock or AI-generated.
`render.py` synthesises a fingerprint (orientation field with a loop core and delta, ridges grown with a Gabor
filter bank), then lights it like a macro photo: cyan key light, orange rim light, scan beam, bokeh, grain.

    pip install numpy scipy pillow
    python3 render.py hero    # writes hero.webp / hero.png
    python3 render.py dash    # writes dash.webp / dash.png
    # copy the .webp files into ../public/img/

Change the look by editing the parameter dicts at the bottom of `render.py`
(`seed` = a different print, `period` = ridge size, `gain` = brightness, `warm` = orange light position).

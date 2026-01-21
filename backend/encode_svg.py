import base64

# Read the SVG file
with open('app/static/character-sheets/character-sheet-page1.svg', 'rb') as f:
    svg_data = f.read()

# Encode to base64
b64_data = base64.b64encode(svg_data).decode('utf-8')

# Create the data URL
data_url = f'data:image/svg+xml;base64,{b64_data}'

print('Data URL ready for CSS:')
print(data_url[:150])
print('...')
print(f'Total length: {len(data_url)} characters')

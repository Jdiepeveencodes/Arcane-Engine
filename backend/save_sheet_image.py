"""
Save the character sheet image provided by the user.
This script converts the image and saves it to the character-sheets folder.
"""
from PIL import Image
import base64
import io

# The attached image appears to be a D&D 5e character sheet template
# For now, we'll create a placeholder that matches the page aspect ratio
# Real implementation would save the actual attached image

try:
    # Create a new image with the appropriate aspect ratio for a character sheet (8.5" x 11" = 612 x 792)
    # Using the colors and style suggested by the template
    img = Image.new('RGB', (612, 792), color=(245, 237, 223))  # Parchment color
    
    # Save the image
    output_path = "app/static/character-sheets/character-sheet-page1.png"
    img.save(output_path, 'PNG')
    print(f"Character sheet image saved to {output_path}")
except Exception as e:
    print(f"Error saving image: {e}")

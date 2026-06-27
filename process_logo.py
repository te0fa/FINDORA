from PIL import Image

def process_image(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    # Find the most common color at the edges to determine the background
    edge_colors = []
    width, height = img.size
    for x in range(width):
        edge_colors.append(img.getpixel((x, 0)))
        edge_colors.append(img.getpixel((x, height - 1)))
    for y in range(height):
        edge_colors.append(img.getpixel((0, y)))
        edge_colors.append(img.getpixel((width - 1, y)))
    
    from collections import Counter
    most_common_color = Counter(edge_colors).most_common(1)[0][0]
    
    print(f"Processing {input_path}, mostly {most_common_color} background")

    # We'll make anything close to the most common color transparent
    newData = []
    for item in datas:
        # Check if the pixel is close to the background color
        # allow some tolerance
        diff = sum(abs(item[i] - most_common_color[i]) for i in range(3))
        if diff < 30: # tolerance
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(output_path, "PNG")

process_image("public/media_1.png", "public/logo-1-processed.png")
process_image("public/media_2.png", "public/logo-2-processed.png")

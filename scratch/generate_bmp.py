import struct

def make_bmp(width, height):
    row_size = (width * 3 + 3) & ~3
    pixel_data_size = row_size * height
    file_size = 54 + pixel_data_size
    
    bmp_header = struct.pack('<2sIHHI', b'BM', file_size, 0, 0, 54)
    dib_header = struct.pack('<IIIIHHIIIIII', 40, width, height, 1, 24, 0, pixel_data_size, 2835, 2835, 0, 0, 0)
    
    pixels = bytearray()
    for y in range(height):
        row = bytearray()
        for x in range(width):
            # Outer border of red, inside is blue
            if x < 30 or x >= width - 30 or y < 30 or y >= height - 30:
                row.extend([0, 0, 255]) # Red BGR
            else:
                row.extend([255, 0, 0]) # Blue BGR
        row.extend([0] * (row_size - len(row)))
        pixels.extend(row)
        
    return bmp_header + dib_header + bytes(pixels)

with open('/Users/mugil/Desktop/Billing_Software_backup_1/scratch/test-image.bmp', 'wb') as f:
    f.write(make_bmp(600, 600))

print("Created scratch/test-image.bmp successfully!")

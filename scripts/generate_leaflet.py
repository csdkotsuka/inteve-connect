import os
import shutil
import pymupdf
from PIL import Image
import io

def generate():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    leaflet_output_dir = os.path.join(base_dir, 'leaflet_output')
    a3_pdf_path = os.path.join(leaflet_output_dir, 'CONNECT_Leaflet_A3_Spread.pdf')
    a4_pdf_path = os.path.join(leaflet_output_dir, 'CONNECT_Leaflet_A4.pdf')

    public_about_dir = os.path.join(base_dir, 'public', 'about')
    public_images_dir = os.path.join(public_about_dir, 'images')
    public_root_dir = os.path.join(base_dir, 'public')

    print(f"Reading {a3_pdf_path}...")
    src_doc = pymupdf.open(a3_pdf_path)

    # 1. Create vector A4 4-page PDF
    print("Generating A4 4-page PDF...")
    a4_doc = pymupdf.open()
    
    # Page dimensions
    spread1 = src_doc[0]
    spread2 = src_doc[1]
    
    w_a4 = spread1.rect.width / 2.0  # 595.5
    h_a4 = spread1.rect.height       # 842.0
    a4_rect = pymupdf.Rect(0, 0, w_a4, h_a4)

    # Page 1: Spread 1 Right (Cover)
    p1 = a4_doc.new_page(width=w_a4, height=h_a4)
    p1.show_pdf_page(a4_rect, src_doc, 0, clip=pymupdf.Rect(w_a4, 0, spread1.rect.width, h_a4))

    # Page 2: Spread 2 Left (Patient Experience)
    p2 = a4_doc.new_page(width=w_a4, height=h_a4)
    p2.show_pdf_page(a4_rect, src_doc, 1, clip=pymupdf.Rect(0, 0, w_a4, h_a4))

    # Page 3: Spread 2 Right (Admin Features)
    p3 = a4_doc.new_page(width=w_a4, height=h_a4)
    p3.show_pdf_page(a4_rect, src_doc, 1, clip=pymupdf.Rect(w_a4, 0, spread2.rect.width, h_a4))

    # Page 4: Spread 1 Left (Back Cover / Benefits & Contact)
    p4 = a4_doc.new_page(width=w_a4, height=h_a4)
    p4.show_pdf_page(a4_rect, src_doc, 0, clip=pymupdf.Rect(0, 0, w_a4, h_a4))

    a4_doc.save(a4_pdf_path)
    a4_doc.close()
    print(f"Saved {a4_pdf_path}")

    # Copy PDFs to public directories for web access / download
    for dest_dir in [public_about_dir, public_root_dir]:
        shutil.copy2(a4_pdf_path, os.path.join(dest_dir, 'CONNECT_Leaflet_A4.pdf'))
        shutil.copy2(a3_pdf_path, os.path.join(dest_dir, 'CONNECT_Leaflet_A3_Spread.pdf'))
        print(f"Copied PDFs to {dest_dir}")

    # 2. Render High-Resolution Images (DPI 288 = 4x)
    print("Rendering high-res images from PDF...")
    dpi = 288
    
    # Spread 1 full & halves
    pix_spread1 = spread1.get_pixmap(dpi=dpi)
    img_spread1 = Image.open(io.BytesIO(pix_spread1.tobytes("png"))).convert("RGB")
    
    pix_spread2 = spread2.get_pixmap(dpi=dpi)
    img_spread2 = Image.open(io.BytesIO(pix_spread2.tobytes("png"))).convert("RGB")

    w_half = img_spread1.width // 2

    # Crop individual pages from spreads
    # Spread 1: Left = Page 4, Right = Page 1
    img_p4 = img_spread1.crop((0, 0, w_half, img_spread1.height))
    img_p1 = img_spread1.crop((w_half, 0, img_spread1.width, img_spread1.height))

    # Spread 2: Left = Page 2, Right = Page 3
    img_p2 = img_spread2.crop((0, 0, w_half, img_spread2.height))
    img_p3 = img_spread2.crop((w_half, 0, img_spread2.width, img_spread2.height))

    # Save to leaflet_output/
    print("Saving images to leaflet_output/...")
    img_spread1.save(os.path.join(leaflet_output_dir, 'spread_1_outside_cover.jpg'), quality=95)
    img_spread2.save(os.path.join(leaflet_output_dir, 'spread_2_inside_flow.jpg'), quality=95)

    img_p1.save(os.path.join(leaflet_output_dir, 'page_1_cover.jpg'), quality=95)
    img_p2.save(os.path.join(leaflet_output_dir, 'page_2_customer_experience.jpg'), quality=95)
    img_p2.save(os.path.join(leaflet_output_dir, 'page_2_flow.jpg'), quality=95)
    img_p3.save(os.path.join(leaflet_output_dir, 'page_3_facility_admin.jpg'), quality=95)
    img_p3.save(os.path.join(leaflet_output_dir, 'page_3_features.jpg'), quality=95)
    img_p4.save(os.path.join(leaflet_output_dir, 'page_4_benefits_and_contact.jpg'), quality=95)

    # Save optimized images for Web (public/about/images/)
    print("Saving web-optimized images to public/about/images/...")
    # Helper to resize by width maintaining aspect ratio
    def save_web_img(img, dest_filename, target_width=None, target_height=None, quality=92):
        out_img = img
        if target_width and img.width > target_width:
            target_h = int(img.height * (target_width / img.width))
            out_img = img.resize((target_width, target_h), Image.Resampling.LANCZOS)
        elif target_height and img.height > target_height:
            target_w = int(img.width * (target_height / img.height))
            out_img = img.resize((target_w, target_height), Image.Resampling.LANCZOS)
        
        dest_path = os.path.join(public_images_dir, dest_filename)
        out_img.save(dest_path, 'JPEG', quality=quality)
        print(f"  Saved {dest_filename} ({out_img.size[0]}x{out_img.size[1]})")

    # Spreads: width 2400px (retina-friendly, crisp on large displays)
    save_web_img(img_spread1, 'leaflet_a3_outside_spread.jpg', target_width=2400)
    save_web_img(img_spread2, 'leaflet_a3_inside_spread.jpg', target_width=2400)

    # Pages: width 1414px (height ~2000px)
    save_web_img(img_p1, 'leaflet_p1_cover.jpg', target_width=1414)
    save_web_img(img_p2, 'leaflet_p2_patient.jpg', target_width=1414)
    save_web_img(img_p3, 'leaflet_p3_admin.jpg', target_width=1414)
    save_web_img(img_p4, 'leaflet_p4_back.jpg', target_width=1414)
    save_web_img(img_p1, 'leaflet_a3_front.jpg', target_width=1414)
    save_web_img(img_p4, 'leaflet_a3_back.jpg', target_width=1414)

    print("All leaflet assets generated and updated successfully!")

if __name__ == '__main__':
    generate()

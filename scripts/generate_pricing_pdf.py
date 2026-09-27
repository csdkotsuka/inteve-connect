import os
import subprocess
import shutil
from pypdf import PdfReader

def generate_pricing_assets():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pricing_html_path = os.path.join(base_dir, 'public', 'about', 'pricing.html')
    leaflet_output_dir = os.path.join(base_dir, 'leaflet_output')
    public_dir = os.path.join(base_dir, 'public')
    public_about_dir = os.path.join(base_dir, 'public', 'about')
    public_images_dir = os.path.join(public_about_dir, 'images')

    os.makedirs(leaflet_output_dir, exist_ok=True)
    os.makedirs(public_images_dir, exist_ok=True)

    output_pdf_path = os.path.join(leaflet_output_dir, 'CONNECT_Pricing_A4.pdf')
    output_jpg_path = os.path.join(leaflet_output_dir, 'CONNECT_Pricing_A4.jpg')
    web_jpg_path = os.path.join(public_images_dir, 'CONNECT_Pricing_A4.jpg')

    chrome_path = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    if not os.path.exists(chrome_path):
        raise FileNotFoundError(f"Chrome not found at {chrome_path}")

    # 1. Generate Vector A4 PDF via Chrome Headless
    print(f"Generating PDF from {pricing_html_path}...")
    file_url = f"file://{pricing_html_path}"
    
    cmd_pdf = [
        chrome_path,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--run-all-compositor-stages-before-draw",
        "--print-to-pdf-no-header",
        f"--print-to-pdf={output_pdf_path}",
        file_url
    ]

    res_pdf = subprocess.run(cmd_pdf, capture_output=True, text=True)
    if res_pdf.returncode != 0:
        print(f"Error generating PDF: {res_pdf.stderr}")
        return False

    print(f"Generated PDF: {output_pdf_path}")
    reader = PdfReader(output_pdf_path)
    page_count = len(reader.pages)
    print(f"PDF Page count: {page_count}")

    # 2. Render high-res image from the generated PDF using macOS qlmanage (pixel-perfect representation of the actual PDF)
    temp_dir = "/tmp/pricing_render"
    os.makedirs(temp_dir, exist_ok=True)
    ql_cmd = ["qlmanage", "-t", "-s", "2480", "-o", temp_dir, output_pdf_path]
    res_ql = subprocess.run(ql_cmd, capture_output=True, text=True)
    
    rendered_png = os.path.join(temp_dir, "CONNECT_Pricing_A4.pdf.png")
    if os.path.exists(rendered_png):
        from PIL import Image
        img = Image.open(rendered_png).convert("RGB")
        img.save(output_jpg_path, "JPEG", quality=95)
        img.save(web_jpg_path, "JPEG", quality=95)
        print(f"Rendered pixel-perfect JPG from PDF: {output_jpg_path} ({img.size[0]}x{img.size[1]})")
        shutil.rmtree(temp_dir, ignore_errors=True)
    else:
        print(f"qlmanage output not found, falling back to direct Chrome screenshot...")
        sheet_url = f"file://{pricing_html_path}?render=sheet"
        cmd_img = [
            chrome_path,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--window-size=1240,1754",
            f"--screenshot={output_jpg_path}",
            sheet_url
        ]
        subprocess.run(cmd_img, capture_output=True)
        if os.path.exists(output_jpg_path):
            shutil.copy2(output_jpg_path, web_jpg_path)

    # Copy PDF to public dirs
    shutil.copy2(output_pdf_path, os.path.join(public_dir, 'CONNECT_Pricing_A4.pdf'))
    shutil.copy2(output_pdf_path, os.path.join(public_about_dir, 'CONNECT_Pricing_A4.pdf'))
    shutil.copy2(output_jpg_path, os.path.join(public_dir, 'CONNECT_Pricing_A4.jpg'))
    print("Copied PDF and images to public and public/about/")

    print("All pricing assets generated successfully!")
    return True

if __name__ == '__main__':
    generate_pricing_assets()

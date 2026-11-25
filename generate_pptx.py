import sys
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_presentation(output_path):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Color Palette
    PRIMARY = RGBColor(29, 78, 216)         # Royal Blue #1D4ED8
    PRIMARY_DARK = RGBColor(15, 23, 42)     # Slate Navy #0F172A
    PRIMARY_LIGHT = RGBColor(239, 246, 255) # Light Blue #EFF6FF
    ACCENT_AMBER = RGBColor(217, 119, 6)    # Amber #D97706
    ACCENT_GREEN = RGBColor(16, 185, 129)   # Emerald #10B981
    ACCENT_ROSE = RGBColor(225, 29, 72)     # Rose #E11D48
    TEXT_DARK = RGBColor(15, 23, 42)
    TEXT_MUTED = RGBColor(100, 116, 139)
    TEXT_WHITE = RGBColor(255, 255, 255)
    CARD_BG = RGBColor(255, 255, 255)
    BORDER_COLOR = RGBColor(226, 232, 240)
    BG_LIGHT = RGBColor(248, 250, 252)

    def set_slide_background(slide, color):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = color
        bg.line.fill.background()
        return bg

    def add_header(slide, title, category, slide_num, total_slides=12):
        line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(0.4), Inches(0.4), Inches(0.08))
        line.fill.solid()
        line.fill.fore_color.rgb = PRIMARY
        line.line.fill.background()

        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.52), Inches(8), Inches(0.35))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        tf_cat.margin_left = tf_cat.margin_right = tf_cat.margin_top = tf_cat.margin_bottom = 0
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category.upper()
        p_cat.font.size = Pt(10)
        p_cat.font.bold = True
        p_cat.font.color.rgb = PRIMARY
        p_cat.font.name = "Tahoma"

        t_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.85), Inches(10.5), Inches(0.6))
        tf = t_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(22)
        p.font.bold = True
        p.font.color.rgb = PRIMARY_DARK
        p.font.name = "Tahoma"

        pn_box = slide.shapes.add_textbox(Inches(11.5), Inches(0.85), Inches(1), Inches(0.4))
        tf_pn = pn_box.text_frame
        p_pn = tf_pn.paragraphs[0]
        p_pn.text = f"{slide_num}/{total_slides}"
        p_pn.alignment = PP_ALIGN.RIGHT
        p_pn.font.size = Pt(11)
        p_pn.font.color.rgb = TEXT_MUTED
        p_pn.font.name = "Tahoma"

    def add_card(slide, left, top, width, height, bg_color=CARD_BG, border_color=BORDER_COLOR):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        if border_color:
            card.line.color.rgb = border_color
            card.line.width = Pt(1)
        else:
            card.line.fill.background()
        return card

    # =========================================================================
    # SLIDE 1: Cover Slide
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1, PRIMARY_DARK)

    decor = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.4), prs.slide_height)
    decor.fill.solid()
    decor.fill.fore_color.rgb = PRIMARY
    decor.line.fill.background()

    b_badge = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(1.4), Inches(3.4), Inches(0.45))
    b_badge.fill.solid()
    b_badge.fill.fore_color.rgb = PRIMARY
    b_badge.line.fill.background()
    p_bb = b_badge.text_frame.paragraphs[0]
    p_bb.text = "STOXY FACILITY MANAGEMENT"
    p_bb.alignment = PP_ALIGN.CENTER
    p_bb.font.size = Pt(11)
    p_bb.font.bold = True
    p_bb.font.color.rgb = TEXT_WHITE
    p_bb.font.name = "Tahoma"

    t1_box = s1.shapes.add_textbox(Inches(1.2), Inches(2.1), Inches(11.2), Inches(2.3))
    tf1 = t1_box.text_frame
    tf1.word_wrap = True
    p1 = tf1.paragraphs[0]
    p1.text = "คู่มือการใช้งานระบบใบแจ้งงานซ่อม (FM)\nและขั้นตอนปฏิบัติงานหน้างานจริง"
    p1.font.size = Pt(36)
    p1.font.bold = True
    p1.font.color.rgb = TEXT_WHITE
    p1.font.name = "Tahoma"
    p1.space_after = Pt(14)

    p1_sub = tf1.add_paragraph()
    p1_sub.text = "ผู้ควบคุมงาน (Admin) สร้างและอนุมัติ • ช่างปฏิบัติงานหน้างานและยื่นมือถือให้ลงนาม • เจ้าของบริเวณตรวจรับงาน"
    p1_sub.font.size = Pt(15)
    p1_sub.font.color.rgb = RGBColor(148, 163, 184)
    p1_sub.font.name = "Tahoma"

    roles_info = [
        ("ผู้ควบคุมงาน (Admin / Supervisor)", "สร้างใบงาน, มอบหมายงานให้ช่างในภาพรวม, ตรวจสอบรายการอุปกรณ์ และอนุมัติตัดสต็อกปิดงาน", PRIMARY),
        ("ช่างผู้ปฏิบัติงาน (Technician)", "รับมอบหมายงาน, ไปซ่อมหน้างาน, เบิกพัสดุในระบบ, ยื่นมือถือให้ผู้แจ้งเซ็นรับทราบผลงาน", ACCENT_AMBER),
        ("เจ้าของบริเวณ (Requester / Owner)", "ผู้แจ้งปัญหา, ตรวจดูงานที่ช่างทำเสร็จ และลงนามรับทราบผลงานผ่านมือถือของช่างที่หน้างาน", ACCENT_GREEN)
    ]
    for idx, (rtitle, rdesc, rcolor) in enumerate(roles_info):
        cx = Inches(1.2 + idx * 3.75)
        add_card(s1, cx, Inches(4.75), Inches(3.55), Inches(1.95), bg_color=RGBColor(30, 41, 59), border_color=rcolor)
        tb = s1.shapes.add_textbox(cx + Inches(0.2), Inches(4.9), Inches(3.15), Inches(1.65))
        tf = tb.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = rtitle
        pt.font.size = Pt(12.5)
        pt.font.bold = True
        pt.font.color.rgb = TEXT_WHITE
        pt.font.name = "Tahoma"
        pt.space_after = Pt(6)
        pd = tf.add_paragraph()
        pd.text = rdesc
        pd.font.size = Pt(10)
        pd.font.color.rgb = RGBColor(203, 213, 225)
        pd.font.name = "Tahoma"

    # =========================================================================
    # SLIDE 2: ความเข้าใจบทบาท & การทำงานร่วมกัน
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2, BG_LIGHT)
    add_header(s2, "บทบาทหน้าที่และการปฏิบัติงานร่วมกัน (Operational Alignment)", "Core Concepts", 2)

    boxes = [
        ("1. ผู้ควบคุมงาน (Admin) เป็นผู้เปิดใบงาน", "แอดมินหรือผู้ควบคุมงานทำหน้าที่รับแจ้งเหตุและสร้างใบงาน FM ในระบบ พร้อมแนบรูปและระบุผู้มอบหมายงาน เพื่อให้เกิดการควบคุมงานอย่างเป็นระบบ", PRIMARY),
        ("2. มอบหมาย & ถือว่ารับงานทันทีในภาพรวม", "เมื่อผู้ควบคุมงานสร้างใบงานเสร็จ จะถือว่าช่างได้รับมอบหมายงานในภาพรวมแล้ว ช่างสามารถเข้าดูรายละเอียดและกดรับงานผูกชื่อตนเองในระบบ", PRIMARY_DARK),
        ("3. ช่างลงพื้นที่ปฏิบัติงาน & จัดการอุปกรณ์", "ช่างลงพื้นที่จริง ดำเนินการซ่อม หากต้องใช้อะไหล่ให้เลือกเบิกจากสต็อกคลัง หากไม่ใช้ให้กดจบงานไม่เบิกของ หรือหากของหมดให้แจ้งรอจัดซื้อ", ACCENT_AMBER),
        ("4. ยื่นมือถือหน้างานให้เจ้าของพื้นที่ลงนาม", "เมื่อซ่อมเสร็จ ช่างจะเปิดหน้าใบงานบนมือถือตนเอง แล้วยื่นให้เจ้าของบริเวณหรือผู้ทำการแทนเซ็นลายมือชื่อตรวจรับงานเสร็จสิ้นหน้างานทันที", ACCENT_GREEN)
    ]
    for idx, (btitle, bdesc, bcolor) in enumerate(boxes):
        col = idx % 2
        row = idx // 2
        bx = Inches(0.8 + col * 5.9)
        by = Inches(1.65 + row * 2.6)
        add_card(s2, bx, by, Inches(5.7), Inches(2.35))
        
        bar = s2.shapes.add_shape(MSO_SHAPE.RECTANGLE, bx, by + Inches(0.2), Inches(0.12), Inches(1.95))
        bar.fill.solid()
        bar.fill.fore_color.rgb = bcolor
        bar.line.fill.background()

        tb = s2.shapes.add_textbox(bx + Inches(0.3), by + Inches(0.25), Inches(5.2), Inches(1.8))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = btitle
        p.font.size = Pt(13.5)
        p.font.bold = True
        p.font.color.rgb = bcolor
        p.font.name = "Tahoma"
        p.space_after = Pt(8)
        p2 = tf.add_paragraph()
        p2.text = bdesc
        p2.font.size = Pt(11)
        p2.font.color.rgb = TEXT_MUTED
        p2.font.name = "Tahoma"

    # =========================================================================
    # SLIDE 3: ไทม์ไลน์กระบวนการทำงาน 5 ขั้นตอนหลัก
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3, BG_LIGHT)
    add_header(s3, "ไทม์ไลน์ลำดับขั้นตอนการปฏิบัติงานหน้างานจริง (Workflow Timeline)", "Field Workflow Timeline", 3)

    steps = [
        ("ขั้นตอนที่ 1", "ผู้ควบคุมงานสร้างใบงาน", "แอดมิน/ผู้ควบคุมงานเปิดใบงาน FM ในระบบ แนบรูปถ่ายจุดชำรุด ระบุผู้มอบหมายงาน", PRIMARY),
        ("ขั้นตอนที่ 2", "มอบหมาย & รับงาน", "ถือว่ารับงานไปแล้วในภาพรวม ช่างกดเข้าดูรายละเอียดและรับดำเนินการผูกชื่อตนเอง", PRIMARY),
        ("ขั้นตอนที่ 3", "ปฏิบัติงาน & จัดการพัสดุ", "ช่างไปหน้างาน: เบิกพัสดุจากคลังสต็อก หรือกดจบงานไม่เบิกของ หรือกดแจ้งรอจัดซื้อ", ACCENT_AMBER),
        ("ขั้นตอนที่ 4", "ผู้แจ้งลงนามบนมือถือช่าง", "ช่างทำงานเสร็จ ยื่นมือถือตนเองให้เจ้าของบริเวณหรือผู้ทำการแทนเซ็นชื่อดิจิทัลรับทราบ", ACCENT_GREEN),
        ("ขั้นตอนที่ 5", "ผู้ควบคุมงานอนุมัติปิดงาน", "ผู้ควบคุมงาน (คนเดียวกับข้อ 1) ตรวจสอบความเรียบร้อย กดยืนยันอนุมัติตัดสต็อกปิดงาน 'เสร็จสิ้น'", ACCENT_GREEN),
        ("ขั้นตอนที่ 6", "พิมพ์ & สรุปรายงาน", "พิมพ์แบบฟอร์ม SFM พร้อมเซ็น หรือ Export รายงานสรุปประจำเดือน PDF/Excel", PRIMARY_DARK),
    ]

    for idx, (step_no, step_title, step_desc, step_col) in enumerate(steps):
        sx = Inches(0.8 + idx * 1.95)
        sy = Inches(1.8)
        
        add_card(s3, sx, sy, Inches(1.85), Inches(4.8))
        
        s_badge = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, sx + Inches(0.15), sy + Inches(0.2), Inches(1.55), Inches(0.45))
        s_badge.fill.solid()
        s_badge.fill.fore_color.rgb = step_col
        s_badge.line.fill.background()
        p_sb = s_badge.text_frame.paragraphs[0]
        p_sb.text = step_no
        p_sb.alignment = PP_ALIGN.CENTER
        p_sb.font.size = Pt(10.5)
        p_sb.font.bold = True
        p_sb.font.color.rgb = TEXT_WHITE
        p_sb.font.name = "Tahoma"

        tb = s3.shapes.add_textbox(sx + Inches(0.15), sy + Inches(0.8), Inches(1.55), Inches(3.8))
        tf = tb.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = step_title
        pt.font.size = Pt(12)
        pt.font.bold = True
        pt.font.color.rgb = PRIMARY_DARK
        pt.font.name = "Tahoma"
        pt.space_after = Pt(10)

        pd = tf.add_paragraph()
        pd.text = step_desc
        pd.font.size = Pt(10)
        pd.font.color.rgb = TEXT_MUTED
        pd.font.name = "Tahoma"

    # =========================================================================
    # SLIDE 4: ขั้นตอนที่ 1 & 2 - ผู้ควบคุมงานสร้างใบงาน และการรับมอบหมาย
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4, BG_LIGHT)
    add_header(s4, "ขั้นตอนที่ 1 & 2: ผู้ควบคุมงานสร้างใบงาน และการรับงานของช่าง", "Step 1 & 2: Creation & Assignment", 4)

    add_card(s4, Inches(0.8), Inches(1.65), Inches(5.7), Inches(5.2))
    tb_c1 = s4.shapes.add_textbox(Inches(1.1), Inches(1.9), Inches(5.1), Inches(4.7))
    tf_c1 = tb_c1.text_frame
    tf_c1.word_wrap = True
    p = tf_c1.paragraphs[0]
    p.text = "1. ผู้ควบคุมงาน (Admin) สร้างใบงาน"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    p.font.name = "Tahoma"
    p.space_after = Pt(10)

    c1_items = [
        "ผู้ควบคุมงานเข้าเมนู FM กด '+ สร้างใบงาน FM ใหม่'",
        "กรอกข้อมูลผู้แจ้งงาน, แผนก/ฝ่าย, สถานที่, และหัวข้องานซ่อม",
        "ระบุชื่อ 'ผู้มอบหมายงาน' (Supervisor/Admin)",
        "แนบรูปถ่ายสภาพหน้างานจริง (สูงสุด 3 รูป มีระบบบีบอัดรูปอัตโนมัติ) เพื่อให้ช่างเห็นอาการล่วงหน้า",
        "สามารถนำเข้าข้อมูลด้วย OCR สแกนเอกสารเดิมได้"
    ]
    for it in c1_items:
        pt = tf_c1.add_paragraph()
        pt.text = f"• {it}"
        pt.font.size = Pt(10.5)
        pt.font.color.rgb = TEXT_DARK
        pt.font.name = "Tahoma"
        pt.space_after = Pt(6)

    add_card(s4, Inches(6.8), Inches(1.65), Inches(5.7), Inches(5.2))
    tb_c2 = s4.shapes.add_textbox(Inches(7.1), Inches(1.9), Inches(5.1), Inches(4.7))
    tf_c2 = tb_c2.text_frame
    tf_c2.word_wrap = True
    p = tf_c2.paragraphs[0]
    p.text = "2. การมอบหมาย & รับงานในภาพรวม"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = PRIMARY_DARK
    p.font.name = "Tahoma"
    p.space_after = Pt(10)

    c2_items = [
        "เมื่อผู้ควบคุมงานสร้างใบงานเสร็จ จะถือว่า 'ช่างได้รับมอบหมายงานในภาพรวมแล้ว' ทันที",
        "ช่างทีมซ่อมบำรุงเข้าดูงานใหม่ในแท็บ 'รอดำเนินการ'",
        "ช่างผู้รับผิดชอบกดปุ่ม 'รับดำเนินการใบงานนี้'",
        "ระบบจะดึงชื่อ นามสกุล และหน่วยงานสังกัดของช่างจากบัญชีที่ Login มาบันทึกลงใบงานอัตโนมัติ (ไม่ต้องพิมพ์เอง)",
        "เอกสารที่เปิดไว้ก่อนหน้านี้จะเว้นว่างชื่อช่างไว้ เพื่อรอช่างเข้ามากดรับงานตามจริง"
    ]
    for it in c2_items:
        pt = tf_c2.add_paragraph()
        pt.text = f"• {it}"
        pt.font.size = Pt(10.5)
        pt.font.color.rgb = TEXT_DARK
        pt.font.name = "Tahoma"
        pt.space_after = Pt(6)

    # =========================================================================
    # SLIDE 5: ขั้นตอนที่ 3 - ช่างปฏิบัติงานหน้างาน & จัดการอุปกรณ์
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5, BG_LIGHT)
    add_header(s5, "ขั้นตอนที่ 3: ช่างลงพื้นที่ปฏิบัติงาน & การจัดการพัสดุ", "Step 3: Field Execution", 5)

    tech_columns = [
        ("3ก. เบิกพัสดุจากคลัง", "Requisition from Stock", [
            "ช่างตรวจสอบพบว่าต้องใช้อะไหล่",
            "ดูตารางสต็อกอุปกรณ์คงเหลือ Real-time ในหน้าใบงาน",
            "กดปุ่ม '+' เพื่อเพิ่มอุปกรณ์ ระบุจำนวนที่ต้องใช้จริง",
            "กดปุ่ม 'ส่งรายการอุปกรณ์รอตรวจสอบ'",
            "ใบงานจะเปลี่ยนสถานะเป็น 'รอตรวจสอบ' เพื่อรอแอดมินอนุมัติตัดสต็อก"
        ], PRIMARY),
        ("3ข. จบงานไม่เบิกของ", "Complete Without Items", [
            "กรณีเป็นงานบริการ ตรวจเช็ค ทำความสะอาด ขันน็อต ปรับตั้งค่า",
            "ไม่มีการเบิกพัสดุหรือใช้วัสดุสิ้นเปลืองใดๆ",
            "ไม่ต้องเลือกอุปกรณ์ในรายการ",
            "กดปุ่ม 'ดำเนินการแล้ว (ไม่เบิกของ)'",
            "ใบงานส่งไปรอผู้ควบคุมงานอนุมัติปิดงานได้ทันที รวดเร็ว ไม่สร้างภาระคลัง"
        ], ACCENT_GREEN),
        ("3ค. อะไหล่หมด / รอจัดซื้อ", "Waiting for Parts", [
            "ตรวจหน้างานแล้วพบว่าไม่มีอะไหล่ในสต็อกคลัง",
            "กดปุ่มสีส้ม 'รอของ (จัดซื้อ/หาอุปกรณ์)'",
            "พิมพ์ระบุของที่ต้องสั่ง เช่น 'ลูกลอยชักโครก 1/2 นิ้ว'",
            "สถานะย่อเป็น: รอจัดซื้อ/หา (ลูกลอยชักโครก 1/2 นิ้ว)",
            "เมื่อของมาส่ง กด 'เปลี่ยนกลับเป็นรอดำเนินการ' เข้าทำต่อ"
        ], ACCENT_AMBER)
    ]

    for idx, (col_title, col_sub, points, col_color) in enumerate(tech_columns):
        cx = Inches(0.8 + idx * 3.9)
        add_card(s5, cx, Inches(1.65), Inches(3.7), Inches(5.2))
        
        c_bar = s5.shapes.add_shape(MSO_SHAPE.RECTANGLE, cx, Inches(1.65), Inches(3.7), Inches(0.65))
        c_bar.fill.solid()
        c_bar.fill.fore_color.rgb = col_color
        c_bar.line.fill.background()
        p_cb = c_bar.text_frame.paragraphs[0]
        p_cb.text = col_title
        p_cb.alignment = PP_ALIGN.CENTER
        p_cb.font.size = Pt(12)
        p_cb.font.bold = True
        p_cb.font.color.rgb = TEXT_WHITE
        p_cb.font.name = "Tahoma"

        tb = s5.shapes.add_textbox(cx + Inches(0.2), Inches(2.4), Inches(3.3), Inches(4.3))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p_sub = tf.paragraphs[0]
        p_sub.text = col_sub.upper()
        p_sub.font.size = Pt(9.5)
        p_sub.font.bold = True
        p_sub.font.color.rgb = col_color
        p_sub.font.name = "Tahoma"
        p_sub.space_after = Pt(8)

        for pt_text in points:
            p_pt = tf.add_paragraph()
            p_pt.text = f"• {pt_text}"
            p_pt.font.size = Pt(10)
            p_pt.font.color.rgb = TEXT_DARK
            p_pt.font.name = "Tahoma"
            p_pt.space_after = Pt(6)

    # =========================================================================
    # SLIDE 6: ขั้นตอนที่ 4 - การลงนามตรวจรับที่หน้างาน (ยื่นมือถือให้ผู้แจ้งเซ็น)
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6, BG_LIGHT)
    add_header(s6, "ขั้นตอนที่ 4: การลงนามตรวจรับหน้างาน (ยื่นมือถือให้ผู้แจ้งเซ็น)", "Step 4: On-Site Signature", 6)

    add_card(s6, Inches(0.8), Inches(1.65), Inches(6.5), Inches(5.2))
    tb_sign = s6.shapes.add_textbox(Inches(1.1), Inches(1.85), Inches(5.9), Inches(4.8))
    tf_sign = tb_sign.text_frame
    tf_sign.word_wrap = True
    
    p = tf_sign.paragraphs[0]
    p.text = "ขั้นตอนการลงนามรับทราบการดำเนินงานที่หน้างาน"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = ACCENT_GREEN
    p.font.name = "Tahoma"
    p.space_after = Pt(10)

    sign_steps = [
        ("ช่างปฏิบัติงานให้แล้วเสร็จที่หน้างานจริง", "เมื่อซ่อมแซมเสร็จสิ้น ตรวจสอบความเรียบร้อยของพื้นที่และอุปกรณ์"),
        ("ช่างเปิดหน้าใบงานบนมือถือตนเอง", "เปิดหน้าใบแจ้งงาน FM ในสมาร์ตโฟน แล้วกดปุ่ม '✍️ ลงนามรับทราบ'"),
        ("ยื่นมือถือให้เจ้าของบริเวณ (ผู้แจ้งงาน)", "ส่งมือถือให้ผู้แจ้งงาน หรือผู้ทำการแทน ตรวจดูผลงาน"),
        ("ผู้แจ้งลงลายมือชื่อดิจิทัลบนหน้าจอ", "วาดลายเซ็นบนช่อง Touchscreen พิมพ์ระบุชื่อ-นามสกุล และรหัสพนักงาน (ถ้ามี) แล้วกดบันทึก"),
        ("ความยืดหยุ่นของระบบ", "ระบบอนุญาตให้ลงนามไว้ล่วงหน้าได้ตั้งแต่สถานะ 'รอดำเนินการ' (กรณีผู้แจ้งจะไม่อยู่หน้างานช่วงบ่าย) หรือลงนามทันทีเมื่อซ่อมเสร็จ")
    ]
    for title, desc in sign_steps:
        p_t = tf_sign.add_paragraph()
        p_t.text = f"• {title}"
        p_t.font.bold = True
        p_t.font.size = Pt(11)
        p_t.font.color.rgb = PRIMARY_DARK
        p_t.font.name = "Tahoma"
        p_d = tf_sign.add_paragraph()
        p_d.text = f"   {desc}"
        p_d.font.size = Pt(10)
        p_d.font.color.rgb = TEXT_MUTED
        p_d.font.name = "Tahoma"
        p_d.space_after = Pt(6)

    # Right: Realistic Scenario Box
    add_card(s6, Inches(7.5), Inches(1.65), Inches(5.0), Inches(5.2), bg_color=PRIMARY_LIGHT, border_color=PRIMARY)
    tb_scen = s6.shapes.add_textbox(Inches(7.8), Inches(1.85), Inches(4.4), Inches(4.8))
    tf_scen = tb_scen.text_frame
    tf_scen.word_wrap = True
    ps_t = tf_scen.paragraphs[0]
    ps_t.text = "📌 ตัวอย่างสถานการณ์จริง: การลงนามหน้างาน"
    ps_t.font.size = Pt(13)
    ps_t.font.bold = True
    ps_t.font.color.rgb = PRIMARY
    ps_t.font.name = "Tahoma"
    ps_t.space_after = Pt(8)

    scenario_text = (
        "📍 สถานการณ์หน้างาน:\n"
        "ใบงาน FM-6090: แอร์น้ำหยด แผนกบัญชี ชั้น 3\n\n"
        "1. ช่างสมชาย เข้าไปล้างท่อน้ำทิ้งแอร์และเป่าฝุ่นจนแอร์ทำงานปกติ น้ำหยุดหยดเรียบร้อย\n"
        "2. ช่างสมชายหยิบมือถือตนเอง เปิดใบงาน FM-6090 กดปุ่ม '✍️ ลงนามรับทราบ'\n"
        "3. ยื่นมือถือให้คุณกนกวรรณ (เจ้าของโต๊ะ/ผู้แจ้งงาน) ตรวจดูความเรียบร้อย\n"
        "4. คุณกนกวรรณเซ็นชื่อด้วยนิ้วมือบนจอมือถือของช่าง พิมพ์ชื่อ 'กนกวรรณ มีสุข' และรหัส 'EMP-084'\n"
        "5. กดบันทึก ลายเซ็นจะถูกแนบลงในระบบทันที พร้อมให้ผู้ควบคุมงานตรวจสอบปิดงาน"
    )
    ps_c = tf_scen.add_paragraph()
    ps_c.text = scenario_text
    ps_c.font.size = Pt(10.5)
    ps_c.font.color.rgb = PRIMARY_DARK
    ps_c.font.name = "Tahoma"

    # =========================================================================
    # SLIDE 7: ขั้นตอนที่ 5 - ผู้ควบคุมงานตรวจสอบและอนุมัติตัดสต็อก
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7, BG_LIGHT)
    add_header(s7, "ขั้นตอนที่ 5: ผู้ควบคุมงานตรวจสอบ & อนุมัติตัดสต็อกปิดงาน", "Step 5: Review & Stock Approval", 7)

    admin_steps = [
        ("1. ผู้ควบคุมงาน (คนเดียวกับข้อ 1) ตรวจสอบงาน", "เมื่อช่างส่งรายการอุปกรณ์และผู้แจ้งลงนามแล้ว ผู้ควบคุมงานจะเห็นงานขึ้นในแท็บ 'รอตรวจสอบ' และมีแถบแจ้งเตือนสีส้มด้านบน", PRIMARY),
        ("2. ตรวจสอบความถูกต้องของอุปกรณ์", "ผู้ควบคุมงานตรวจสอบอุปกรณ์ที่ช่างขอเบิก หากจำนวนไม่ตรงหรือหยิบผิดรุ่น สามารถแก้ไขจำนวน หรือกดเพิ่ม/ลบรายการอุปกรณ์ก่อนอนุมัติได้โดยตรง", PRIMARY),
        ("3. กดยืนยันอนุมัติ (1-Click Approval)", "เมื่อข้อมูลถูกต้อง ผู้ควบคุมงานกดปุ่ม 'อนุมัติและตัดสต็อก' (หรืออนุมัติปิดงานไม่เบิกของ)", ACCENT_GREEN),
        ("4. ผลลัพธ์อัตโนมัติ: ตัดสต็อก & บันทึกเสร็จสิ้น", "ระบบตัดลดยอดพัสดุในคลังทันที บันทึก Stock Movement และเปลี่ยนสถานะใบงานเป็น 'เสร็จสิ้น' พร้อมประทับ Timestamp วันที่เสร็จสิ้นอัตโนมัติ", ACCENT_GREEN)
    ]
    for idx, (atitle, adesc, acolor) in enumerate(admin_steps):
        col = idx % 2
        row = idx // 2
        ax = Inches(0.8 + col * 5.9)
        ay = Inches(1.65 + row * 2.6)
        add_card(s7, ax, ay, Inches(5.7), Inches(2.35))
        
        strip = s7.shapes.add_shape(MSO_SHAPE.RECTANGLE, ax, ay, Inches(5.7), Inches(0.12))
        strip.fill.solid()
        strip.fill.fore_color.rgb = acolor
        strip.line.fill.background()

        tb = s7.shapes.add_textbox(ax + Inches(0.3), ay + Inches(0.3), Inches(5.1), Inches(1.8))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = atitle
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = acolor
        p.font.name = "Tahoma"
        p.space_after = Pt(6)
        p2 = tf.add_paragraph()
        p2.text = adesc
        p2.font.size = Pt(10.5)
        p2.font.color.rgb = TEXT_MUTED
        p2.font.name = "Tahoma"

    # =========================================================================
    # SLIDE 8: สิทธิ์พิเศษของผู้ดูแลระบบ (Admin Super Powers)
    # =========================================================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8, BG_LIGHT)
    add_header(s8, "สิทธิ์พิเศษของผู้ดูแลระบบ (Admin Powers & Editing)", "Admin Privileges", 8)

    add_card(s8, Inches(0.8), Inches(1.65), Inches(5.7), Inches(5.2))
    tb_p1 = s8.shapes.add_textbox(Inches(1.1), Inches(1.9), Inches(5.1), Inches(4.7))
    tf_p1 = tb_p1.text_frame
    tf_p1.word_wrap = True
    p = tf_p1.paragraphs[0]
    p.text = "✏️ ปุ่ม 'แก้ไขใบงาน' (Admin Edit Details)"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    p.font.name = "Tahoma"
    p.space_after = Pt(10)

    p1_items = [
        "แก้ไขเลขที่ใบงาน, ประเภทงาน, วันที่แจ้ง, วันที่ใช้งาน",
        "แก้ไขเรื่อง/หัวข้อ, สถานที่, และรายละเอียดงาน",
        "แก้ไขชื่อผู้แจ้งงาน, แผนก, เบอร์โทร และอีเมล",
        "แก้ไขชื่อช่างผู้ดำเนินการ และหน่วยงานช่าง (หรือเว้นว่างเพื่อล้างค่า)",
        "จัดการรูปภาพประกอบ: ลบรูปเดิมออก หรืออัปโหลดรูปใหม่เพิ่มเติม (รวมสูงสุดไม่เกิน 3 รูป พร้อมระบบบีบอัดภาพอัตโนมัติ)",
        "ระบบบันทึก Timestamp และแจ้งเตือนการแก้ไขผ่าน LINE"
    ]
    for it in p1_items:
        pt = tf_p1.add_paragraph()
        pt.text = f"• {it}"
        pt.font.size = Pt(10.5)
        pt.font.color.rgb = TEXT_DARK
        pt.font.name = "Tahoma"
        pt.space_after = Pt(6)

    add_card(s8, Inches(6.8), Inches(1.65), Inches(5.7), Inches(5.2))
    tb_p2 = s8.shapes.add_textbox(Inches(7.1), Inches(1.9), Inches(5.1), Inches(4.7))
    tf_p2 = tb_p2.text_frame
    tf_p2.word_wrap = True
    p = tf_p2.paragraphs[0]
    p.text = "⚙️ ปุ่ม 'แก้ไขสถานะ' (Admin Status Override)"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = ACCENT_AMBER
    p.font.name = "Tahoma"
    p.space_after = Pt(10)

    p2_items = [
        "ผู้ดูแลระบบมีสิทธิ์ในการปรับเปลี่ยนสถานะใบงานได้ 'ทุกสถานะ'",
        "ครอบคลุมถึงใบงานที่ 'เสร็จสิ้นแล้ว' หรือ 'ยกเลิกแล้ว' ก็สามารถแก้ไขได้",
        "ปรับเปลี่ยนเป็น: รอดำเนินการ, รอจัดซื้อ/หา, รอตรวจสอบ, เสร็จสิ้น, ส่งกลับแก้ไข หรือ ยกเลิก",
        "มีช่องให้ระบุ 'หมายเหตุการเปลี่ยนสถานะ' เพื่อบันทึกเป็นประวัติการเปลี่ยนแปลง",
        "หากปรับเป็น 'เสร็จสิ้น' ระบบจะบันทึกชื่อแอดมินผู้อนุมัติและเวลาเสร็จสิ้นให้อัตโนมัติ"
    ]
    for it in p2_items:
        pt = tf_p2.add_paragraph()
        pt.text = f"• {it}"
        pt.font.size = Pt(10.5)
        pt.font.color.rgb = TEXT_DARK
        pt.font.name = "Tahoma"
        pt.space_after = Pt(8)

    # =========================================================================
    # SLIDE 9: ฟีเจอร์การค้นหา, ตัวกรอง และการจัดเรียง (Filter & Sort By)
    # =========================================================================
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9, BG_LIGHT)
    add_header(s9, "ฟีเจอร์การค้นหา ตัวกรอง และการเรียงลำดับ (Filter & Sort By)", "Search & Navigation", 9)

    filter_features = [
        ("Sort By: เรียงลำดับตาม", "Default: เลขที่ใบงาน มาก → น้อย", [
            "ค่าเริ่มต้นระบบจัดเรียงตาม 'เลขที่ใบงาน (มาก → น้อย)' ทันทีที่เปิดหน้า",
            "ใช้ระบบ Natural Sort ถูกต้องทั้งเลขล้วน (เช่น 6095, 6090) และแบบมีอักษรนำ (FM-6095)",
            "สามารถเลือกเรียงตาม: วันที่แจ้ง (ใหม่/เก่า), วันที่ต้องการใช้ หรือ วันที่สร้างได้"
        ], PRIMARY),
        ("Search Box: ช่องค้นหาอัจฉริยะ", "Real-time Multi-field Search", [
            "ค้นหาได้ทั้ง เลขที่ใบงาน (เช่น 6090), ชื่องาน, สถานที่ดำเนินการ",
            "ค้นหาตาม ชื่อผู้แจ้ง, แผนก/ฝ่ายของผู้แจ้ง",
            "ค้นหาตาม ชื่อช่างผู้ดำเนินการ, สังกัดช่าง, ประเภทงาน และหมายเหตุ",
            "มีปุ่ม (X) ในช่องเพื่อล้างคำค้นหาได้อย่างสะดวกรวดเร็ว"
        ], PRIMARY_DARK),
        ("Quick Filters & View Modes", "Category Filter & My Tasks", [
            "ตัวกรองประเภทงาน: เลือกดูเฉพาะ ระบบไฟฟ้า, ระบบประปา, แอร์, อาคาร ฯลฯ",
            "ปุ่มลัด 'งานของฉัน': กดเพื่อกรองดูเฉพาะงานที่ตนเองรับผิดชอบได้ทันทีในคลิกเดียว",
            "แท็บสถานะ: แสดง Badge นับจำนวนใบงานในแต่ละสถานะแบบ Real-time",
            "ปุ่ม 'ล้างตัวกรอง': แสดงขึ้นเมื่อมีการใช้งานตัวกรอง กดเพื่อรีเซ็ตกลับค่าเริ่มต้น"
        ], ACCENT_GREEN)
    ]

    for idx, (ftitle, fsub, fpoints, fcol) in enumerate(filter_features):
        fx = Inches(0.8 + idx * 3.9)
        add_card(s9, fx, Inches(1.65), Inches(3.7), Inches(5.2))
        
        h_box = s9.shapes.add_shape(MSO_SHAPE.RECTANGLE, fx, Inches(1.65), Inches(3.7), Inches(0.8))
        h_box.fill.solid()
        h_box.fill.fore_color.rgb = fcol
        h_box.line.fill.background()
        p_hb = h_box.text_frame.paragraphs[0]
        p_hb.text = ftitle
        p_hb.alignment = PP_ALIGN.CENTER
        p_hb.font.size = Pt(12)
        p_hb.font.bold = True
        p_hb.font.color.rgb = TEXT_WHITE
        p_hb.font.name = "Tahoma"

        tb = s9.shapes.add_textbox(fx + Inches(0.2), Inches(2.55), Inches(3.3), Inches(4.1))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p_sub = tf.paragraphs[0]
        p_sub.text = fsub
        p_sub.font.size = Pt(9.5)
        p_sub.font.bold = True
        p_sub.font.color.rgb = fcol
        p_sub.font.name = "Tahoma"
        p_sub.space_after = Pt(8)

        for pt_text in fpoints:
            p_pt = tf.add_paragraph()
            p_pt.text = f"• {pt_text}"
            p_pt.font.size = Pt(10)
            p_pt.font.color.rgb = TEXT_DARK
            p_pt.font.name = "Tahoma"
            p_pt.space_after = Pt(6)

    # =========================================================================
    # SLIDE 10: การพิมพ์เอกสาร & รายงานสรุป (PDF & Excel Export)
    # =========================================================================
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_background(s10, BG_LIGHT)
    add_header(s10, "การพิมพ์เอกสารใบงาน & การออกรายงานสรุป (SFM & Reports)", "Reporting & Printing", 10)

    add_card(s10, Inches(0.8), Inches(1.65), Inches(5.7), Inches(5.2))
    tb_pr = s10.shapes.add_textbox(Inches(1.1), Inches(1.9), Inches(5.1), Inches(4.7))
    tf_pr = tb_pr.text_frame
    tf_pr.word_wrap = True
    p = tf_pr.paragraphs[0]
    p.text = "🖨️ การพิมพ์ใบงาน SFM (Print Single Work Order)"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    p.font.name = "Tahoma"
    p.space_after = Pt(10)

    pr_items = [
        "ปุ่ม 'พิมพ์' ด้านบน จะแสดงเฉพาะเอกสารแบบฟอร์ม อบก-จ.-01 เท่านั้น (ซ่อนแถบเมนูข้างและปุ่มต่างๆ ทั้งหมดอัตโนมัติ)",
        "ตั้งชื่อไฟล์ PDF ให้อัตโนมัติเป็น: SFM-[เลขที่ใบงาน] เช่น SFM-6090",
        "รวมข้อมูลหัวข้องาน, สถานที่, ผู้แจ้ง, ช่างผู้ดำเนินการ, ตารางรายการอุปกรณ์ที่ใช้ และช่องลงลายมือชื่อครบถ้วน",
        "เอกสารที่ยังไม่มีช่างรับงาน จะแสดงขีด (-) สะอาดตา ไม่แสดงข้อความค้างในวงเล็บ"
    ]
    for it in pr_items:
        pt = tf_pr.add_paragraph()
        pt.text = f"• {it}"
        pt.font.size = Pt(10.5)
        pt.font.color.rgb = TEXT_DARK
        pt.font.name = "Tahoma"
        pt.space_after = Pt(8)

    add_card(s10, Inches(6.8), Inches(1.65), Inches(5.7), Inches(5.2))
    tb_rep = s10.shapes.add_textbox(Inches(7.1), Inches(1.9), Inches(5.1), Inches(4.7))
    tf_rep = tb_rep.text_frame
    tf_rep.word_wrap = True
    p = tf_rep.paragraphs[0]
    p.text = "📊 รายงานสรุปใบแจ้งงานซ่อม (PDF & Excel Export)"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = ACCENT_GREEN
    p.font.name = "Tahoma"
    p.space_after = Pt(10)

    rep_items = [
        "เข้าเมนู 'รายงาน' เลือก 'รายงานสรุปใบงานและอุปกรณ์ที่ใช้ (FM)'",
        "เลือกช่วงเวลา: ดูทั้งหมด หรือเลือกเฉพาะรอบเดือนที่ต้องการได้",
        "การปรับปรุงสถานะใหม่ตามคำขอ:",
        "   - กรณี 'เสร็จสิ้น': แสดงวันที่ในวงเล็บ เช่น เสร็จสิ้น (24/11/2569)",
        "   - กรณี 'รอจัดซื้อ': ย่อเป็น รอจัดซื้อ/หา (ข้อความที่กรอก) เช่น รอจัดซื้อ/หา (หลอดไฟ LED)",
        "รองรับทั้งไฟล์ PDF (ตารางแนวนอน สวยงาม พร้อมหัวตารางสี Royal Blue) และ Excel (.xlsx มี 2 Sheet: สรุปใบงาน และ รายการอุปกรณ์ที่ใช้)"
    ]
    for it in rep_items:
        pt = tf_rep.add_paragraph()
        pt.text = f"• {it}" if not it.startswith("   -") else it
        pt.font.size = Pt(10.5)
        pt.font.color.rgb = PRIMARY_DARK if not it.startswith("   -") else PRIMARY
        pt.font.bold = it.startswith("   -") or "การปรับปรุงสถานะใหม่" in it
        pt.font.name = "Tahoma"
        pt.space_after = Pt(6)

    # =========================================================================
    # SLIDE 11: ตารางสรุปหน้าที่และความรับผิดชอบ
    # =========================================================================
    s11 = prs.slides.add_slide(blank_layout)
    set_slide_background(s11, BG_LIGHT)
    add_header(s11, "ตารางสรุปหน้าที่และความรับผิดชอบ (Role & Responsibility Matrix)", "Roles & Responsibilities", 11)

    table_shape = s11.shapes.add_table(7, 4, Inches(0.8), Inches(1.7), Inches(11.7), Inches(5.0))
    table = table_shape.table
    table.columns[0].width = Inches(3.9)
    table.columns[1].width = Inches(2.6)
    table.columns[2].width = Inches(2.6)
    table.columns[3].width = Inches(2.6)

    headers_matrix = ["ขั้นตอน / การดำเนินการ", "ผู้ควบคุมงาน (Admin)", "ช่างผู้ปฏิบัติงาน (Tech)", "เจ้าของบริเวณ (Requester)"]
    for c_idx, h_text in enumerate(headers_matrix):
        cell = table.cell(0, c_idx)
        cell.fill.solid()
        cell.fill.fore_color.rgb = PRIMARY
        cell.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = cell.text_frame.paragraphs[0]
        p.text = h_text
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = TEXT_WHITE
        p.font.name = "Tahoma"
        p.alignment = PP_ALIGN.CENTER if c_idx > 0 else PP_ALIGN.LEFT

    matrix_data = [
        ("1. สร้างใบแจ้งงาน FM ในระบบ / แนบรูป", "✔️ ผู้สร้างหลัก", "—", "แจ้งเรื่องให้ผู้ควบคุม"),
        ("2. มอบหมายงาน / รับงานในภาพรวม", "✔️ ผู้มอบหมาย", "✔️ รับงานหน้างาน", "—"),
        ("3. ปฏิบัติงาน / เบิกพัสดุ / แจ้งรอจัดซื้อ", "—", "✔️ ปฏิบัติงานจริง", "—"),
        ("4. การลงนามรับทราบผลการดำเนินงาน", "—", "✔️ ยื่นมือถือให้เซ็น", "✔️ ลงนามตรวจรับบนมือถือช่าง"),
        ("5. ตรวจสอบรายการอุปกรณ์ & อนุมัติตัดสต็อก", "✔️ ตรวจ & ตัดสต็อก", "—", "—"),
        ("6. สิทธิ์แก้ไขใบงาน & ปรับสถานะทุกสถานะ", "✔️ สิทธิ์เฉพาะ Admin", "—", "—"),
    ]

    for r_idx, row_values in enumerate(matrix_data):
        for c_idx, val in enumerate(row_values):
            cell = table.cell(r_idx + 1, c_idx)
            cell.fill.solid()
            cell.fill.fore_color.rgb = CARD_BG if r_idx % 2 == 0 else RGBColor(241, 245, 249)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            p = cell.text_frame.paragraphs[0]
            p.text = val
            p.font.size = Pt(10.5)
            p.font.name = "Tahoma"
            if c_idx > 0:
                p.alignment = PP_ALIGN.CENTER
                if "✔️" in val:
                    p.font.bold = True
                    p.font.color.rgb = PRIMARY if "Admin" in headers_matrix[c_idx] else (ACCENT_AMBER if "Tech" in headers_matrix[c_idx] else ACCENT_GREEN)
                else:
                    p.font.color.rgb = TEXT_MUTED
            else:
                p.font.bold = True
                p.font.color.rgb = PRIMARY_DARK

    # =========================================================================
    # SLIDE 12: สรุปประโยชน์และคำแนะนำ
    # =========================================================================
    s12 = prs.slides.add_slide(blank_layout)
    set_slide_background(s12, PRIMARY_DARK)
    
    cat_box = s12.shapes.add_textbox(Inches(0.8), Inches(0.6), Inches(8), Inches(0.35))
    tf_cat = cat_box.text_frame
    p_cat = tf_cat.paragraphs[0]
    p_cat.text = "SUMMARY & BEST PRACTICES"
    p_cat.font.size = Pt(11)
    p_cat.font.bold = True
    p_cat.font.color.rgb = RGBColor(96, 165, 250)
    p_cat.font.name = "Tahoma"

    t_box = s12.shapes.add_textbox(Inches(0.8), Inches(0.95), Inches(11), Inches(0.6))
    tf = t_box.text_frame
    p = tf.paragraphs[0]
    p.text = "สรุปประโยชน์ของระบบ FM และแนวปฏิบัติที่ดี"
    p.font.size = Pt(24)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE
    p.font.name = "Tahoma"

    benefits = [
        ("ควบคุมงานเป็นระบบ", "ผู้ควบคุมงานเป็นจุดศูนย์กลางในการเปิดงานและตรวจรับตัดสต็อก ทำให้งานไม่ตกหล่นและมีผู้รับผิดชอบชัดเจน", PRIMARY),
        ("หลักฐานตรวจรับหน้างานจริง", "ช่างนำมือถือไปให้เจ้าของพื้นที่ตรวจงานและเซ็นรับทราบทันที มีหลักฐานเป็นลายเซ็นดิจิทัลพร้อม Timestamp", ACCENT_GREEN),
        ("สต็อกตรง 100% ไม่สูญหาย", "พัสดุและอะไหล่ทุกชิ้นถูกผูกกับเลขที่ใบงาน FM และอนุมัติตัดสต็อกอัตโนมัติ ไม่ต้องคีย์เอกสารซ้ำ", ACCENT_AMBER),
        ("รายงานและตรวจสอบย้อนหลัง", "ผู้บริหารสามารถตรวจสอบประวัติการซ่อมบำรุงและต้นทุนพัสดุที่ใช้ย้อนหลังได้ตลอดเวลาผ่าน PDF/Excel", RGBColor(168, 85, 247))
    ]

    for idx, (btitle, bdesc, bcol) in enumerate(benefits):
        bx = Inches(0.8 + idx * 2.95)
        add_card(s12, bx, Inches(1.85), Inches(2.8), Inches(4.8), bg_color=RGBColor(30, 41, 59), border_color=bcol)
        
        b_badge = s12.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, bx + Inches(0.2), Inches(2.1), Inches(2.4), Inches(0.45))
        b_badge.fill.solid()
        b_badge.fill.fore_color.rgb = bcol
        b_badge.line.fill.background()
        p_bb = b_badge.text_frame.paragraphs[0]
        p_bb.text = f"KEY BENEFIT #{idx+1}"
        p_bb.alignment = PP_ALIGN.CENTER
        p_bb.font.size = Pt(10)
        p_bb.font.bold = True
        p_bb.font.color.rgb = TEXT_WHITE
        p_bb.font.name = "Tahoma"

        tb = s12.shapes.add_textbox(bx + Inches(0.2), Inches(2.8), Inches(2.4), Inches(3.6))
        tf = tb.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = btitle
        pt.font.size = Pt(13)
        pt.font.bold = True
        pt.font.color.rgb = TEXT_WHITE
        pt.font.name = "Tahoma"
        pt.space_after = Pt(10)
        pd = tf.add_paragraph()
        pd.text = bdesc
        pd.font.size = Pt(10.5)
        pd.font.color.rgb = RGBColor(203, 213, 225)
        pd.font.name = "Tahoma"

    prs.save(output_path)
    print(f"Presentation saved to: {output_path}")

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "FM_User_Manual_Presentation.pptx"
    create_presentation(out_file)

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
    PRIMARY = RGBColor(29, 78, 216)      # Royal Blue #1D4ED8
    PRIMARY_DARK = RGBColor(15, 23, 42)  # Slate Navy #0F172A
    PRIMARY_LIGHT = RGBColor(239, 246, 255) # Light Blue #EFF6FF
    ACCENT_AMBER = RGBColor(217, 119, 6) # Amber #D97706
    ACCENT_GREEN = RGBColor(16, 185, 129)# Emerald #10B981
    ACCENT_ROSE = RGBColor(225, 29, 72)  # Rose #E11D48
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
        # Top banner background accent line
        line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(0.4), Inches(0.4), Inches(0.08))
        line.fill.solid()
        line.fill.fore_color.rgb = PRIMARY
        line.line.fill.background()

        # Category tag
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

        # Title
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

        # Page number
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

    # Accent decorative shape
    decor = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.4), prs.slide_height)
    decor.fill.solid()
    decor.fill.fore_color.rgb = PRIMARY
    decor.line.fill.background()

    # Sub-badge
    b_badge = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(1.5), Inches(3.2), Inches(0.45))
    b_badge.fill.solid()
    b_badge.fill.fore_color.rgb = PRIMARY
    b_badge.line.fill.background()
    p_bb = b_badge.text_frame.paragraphs[0]
    p_bb.text = "STOXY INVENTORY & FM SYSTEM"
    p_bb.alignment = PP_ALIGN.CENTER
    p_bb.font.size = Pt(11)
    p_bb.font.bold = True
    p_bb.font.color.rgb = TEXT_WHITE
    p_bb.font.name = "Tahoma"

    # Main Title
    t1_box = s1.shapes.add_textbox(Inches(1.2), Inches(2.2), Inches(11), Inches(2.2))
    tf1 = t1_box.text_frame
    tf1.word_wrap = True
    p1 = tf1.paragraphs[0]
    p1.text = "คู่มือการใช้งานระบบใบแจ้งงานซ่อม (FM)\nและการจัดการเบิกจ่ายพัสดุในระบบ"
    p1.font.size = Pt(36)
    p1.font.bold = True
    p1.font.color.rgb = TEXT_WHITE
    p1.font.name = "Tahoma"
    p1.space_after = Pt(16)

    p1_sub = tf1.add_paragraph()
    p1_sub.text = "ขั้นตอนปฏิบัติงานสำหรับ: ผู้แจ้งงาน | ช่างผู้ดำเนินการ (Main Users) | ผู้ดูแลระบบ (Admin Reviewers)"
    p1_sub.font.size = Pt(16)
    p1_sub.font.color.rgb = RGBColor(148, 163, 184) # Slate 400
    p1_sub.font.name = "Tahoma"

    # 3 Summary Cards at bottom of slide 1
    roles_info = [
        ("ผู้แจ้งงาน (Requester)", "เปิดใบงาน, แนบรูปประกอบ, ติดตามสถานะ, ลงนามรับทราบงานดิจิทัล", PRIMARY),
        ("ช่างผู้ดำเนินการ (Technician)", "รับงานอัตโนมัติ, บันทึกขอเบิกอุปกรณ์, แจ้งรอจัดซื้อ, ปิดงานไม่เบิกของ", ACCENT_AMBER),
        ("ผู้ตรวจสอบ (Admin/Manager)", "ตรวจตัดสต็อกอัตโนมัติ, ปรับปรุงรายการเบิก, แก้ไขใบงาน, Export รายงาน", ACCENT_GREEN)
    ]
    for idx, (rtitle, rdesc, rcolor) in enumerate(roles_info):
        cx = Inches(1.2 + idx * 3.7)
        card = add_card(s1, cx, Inches(4.8), Inches(3.5), Inches(1.8), bg_color=RGBColor(30, 41, 59), border_color=rcolor)
        tb = s1.shapes.add_textbox(cx + Inches(0.2), Inches(4.95), Inches(3.1), Inches(1.5))
        tf = tb.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = rtitle
        pt.font.size = Pt(13)
        pt.font.bold = True
        pt.font.color.rgb = TEXT_WHITE
        pt.font.name = "Tahoma"
        pt.space_after = Pt(6)
        pd = tf.add_paragraph()
        pd.text = rdesc
        pd.font.size = Pt(10.5)
        pd.font.color.rgb = RGBColor(203, 213, 225)
        pd.font.name = "Tahoma"

    # =========================================================================
    # SLIDE 2: ภาพรวมระบบ FM & การเชื่อมโยงคลังพัสดุ
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2, BG_LIGHT)
    add_header(s2, "ภาพรวมระบบใบแจ้งงานซ่อม Facility Management (FM)", "Introduction & Architecture", 2)

    # 4 Highlights Boxes
    boxes = [
        ("1. เชื่อมโยงตัดสต็อกแม่นยำ 100%", "เมื่อช่างระบุอุปกรณ์และแอดมินอนุมัติ ระบบจะตัดสต็อกในคลังให้อัตโนมัติ พร้อมบันทึกประวัติ Stock Movement ทันที ไม่ต้องคีย์ซ้ำซ้อน", PRIMARY),
        ("2. สิทธิ์และความรับผิดชอบชัดเจน", "ผู้ดำเนินการจะผูกกับบัญชีผู้ใช้ขณะนั้นโดยตรง (Auto-Claim) ระบุตัวตนผู้ทำงานและหน่วยงานชัดเจน พร้อมมีระบบลงนามรับทราบจากผู้แจ้ง", ACCENT_GREEN),
        ("3. รองรับทั้งเบิกของ & ไม่เบิกของ", "งานซ่อมทั่วไปที่ไม่มีการใช้วัสดุสามารถกด 'ดำเนินการแล้ว (ไม่เบิกของ)' ได้ทันที หรืองานที่ขาดอะไหล่สามารถระบุสถานะ 'รอจัดซื้อ/หา' ได้", ACCENT_AMBER),
        ("4. ค้นหา รายงาน & สืบประวัติสมบูรณ์", "ระบบ Filter และ Sort By ค้นหาไว เรียงเลขที่ใบงานจากมากไปน้อยเป็นค่าเริ่มต้น พร้อมรายงานสรุป PDF/Excel ครบถ้วน", PRIMARY_DARK)
    ]
    for idx, (btitle, bdesc, bcolor) in enumerate(boxes):
        col = idx % 2
        row = idx // 2
        bx = Inches(0.8 + col * 5.9)
        by = Inches(1.65 + row * 2.6)
        add_card(s2, bx, by, Inches(5.7), Inches(2.35))
        
        # Color bar indicator on left of card
        bar = s2.shapes.add_shape(MSO_SHAPE.RECTANGLE, bx, by + Inches(0.2), Inches(0.12), Inches(1.95))
        bar.fill.solid()
        bar.fill.fore_color.rgb = bcolor
        bar.line.fill.background()

        tb = s2.shapes.add_textbox(bx + Inches(0.3), by + Inches(0.25), Inches(5.2), Inches(1.8))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = btitle
        p.font.size = Pt(14)
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
    # SLIDE 3: ไทม์ไลน์ภาพรวม (End-to-End Workflow Timeline)
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3, BG_LIGHT)
    add_header(s3, "ไทม์ไลน์ลำดับขั้นตอนการปฏิบัติงาน (End-to-End Lifecycle)", "Workflow Timeline", 3)

    steps = [
        ("ขั้นตอนที่ 1", "สร้างใบแจ้งงาน", "ผู้แจ้ง/แอดมิน กรอกข้อมูล หรืออัปโหลดไฟล์ OCR + รูปถ่ายหน้างาน (สูงสุด 3 รูป)", PRIMARY),
        ("ขั้นตอนที่ 2", "มอบหมาย / รับงาน", "ช่างกดเข้ารับใบงาน ระบบดึงชื่อ-สังกัดของช่างผู้ใช้งานขณะนั้นลงในใบงานอัตโนมัติ", PRIMARY),
        ("ขั้นตอนที่ 3", "ปฏิบัติงาน & เบิกของ", "เลือกอุปกรณ์จากคลังสต็อก หรือกด 'ดำเนินการแล้ว (ไม่เบิกของ)' หรือ 'รอจัดซื้อ/หา'", ACCENT_AMBER),
        ("ขั้นตอนที่ 4", "ผู้แจ้งลงนาม", "ผู้แจ้งงานตรวจสอบและลงลายมือชื่อดิจิทัลรับทราบการดำเนินการ (ระบุชื่อ + รหัสพนักงาน)", ACCENT_GREEN),
        ("ขั้นตอนที่ 5", "แอดมินอนุมัติ", "ผู้ดูแลระบบตรวจสอบรายการอุปกรณ์ ตัดสต็อกคลังอัตโนมัติ และปิดสถานะ 'เสร็จสิ้น'", ACCENT_GREEN),
        ("ขั้นตอนที่ 6", "พิมพ์ & รายงาน", "พิมพ์แบบฟอร์ม SFM หรือ Export รายงานสรุปประจำเดือนเป็น PDF และ Excel", PRIMARY_DARK),
    ]

    for idx, (step_no, step_title, step_desc, step_col) in enumerate(steps):
        sx = Inches(0.8 + idx * 1.95)
        sy = Inches(1.8)
        
        # Step Card
        add_card(s3, sx, sy, Inches(1.85), Inches(4.8))
        
        # Step badge header
        s_badge = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, sx + Inches(0.15), sy + Inches(0.2), Inches(1.55), Inches(0.45))
        s_badge.fill.solid()
        s_badge.fill.fore_color.rgb = step_col
        s_badge.line.fill.background()
        p_sb = s_badge.text_frame.paragraphs[0]
        p_sb.text = step_no
        p_sb.alignment = PP_ALIGN.CENTER
        p_sb.font.size = Pt(11)
        p_sb.font.bold = True
        p_sb.font.color.rgb = TEXT_WHITE
        p_sb.font.name = "Tahoma"

        tb = s3.shapes.add_textbox(sx + Inches(0.15), sy + Inches(0.8), Inches(1.55), Inches(3.8))
        tf = tb.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = step_title
        pt.font.size = Pt(13)
        pt.font.bold = True
        pt.font.color.rgb = PRIMARY_DARK
        pt.font.name = "Tahoma"
        pt.space_after = Pt(10)

        pd = tf.add_paragraph()
        pd.text = step_desc
        pd.font.size = Pt(10.5)
        pd.font.color.rgb = TEXT_MUTED
        pd.font.name = "Tahoma"

    # =========================================================================
    # SLIDE 4: ขั้นตอนฝั่งผู้แจ้งงาน (Requester / Staff)
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4, BG_LIGHT)
    add_header(s4, "คู่มือการใช้งาน: ฝั่งผู้แจ้งงาน (Requester)", "Role: Requester Guide", 4)

    # Left: Steps
    add_card(s4, Inches(0.8), Inches(1.65), Inches(6.8), Inches(5.2))
    tb_req = s4.shapes.add_textbox(Inches(1.1), Inches(1.85), Inches(6.2), Inches(4.8))
    tf_req = tb_req.text_frame
    tf_req.word_wrap = True
    
    p = tf_req.paragraphs[0]
    p.text = "ขั้นตอนการแจ้งงานและการลงนามรับทราบ"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    p.font.name = "Tahoma"
    p.space_after = Pt(12)

    req_steps = [
        ("1. สร้างใบแจ้งงานใหม่", "กดปุ่ม '+ สร้างใบงาน FM ใหม่' กรอกข้อมูลผู้แจ้ง, แผนก, สถานที่, และหัวข้องานที่ต้องการซ่อม"),
        ("2. แนบรูปถ่ายหน้างาน (ไม่เกิน 3 รูป)", "ถ่ายรูปจุดที่ชำรุด เช่น รอยรั่ว สวิตช์เสีย ระบบจะบีบอัดรูปภาพให้อัตโนมัติ"),
        ("3. ติดตามสถานะงานแบบ Real-time", "ตรวจสอบว่างานอยู่ในสถานะ: รอดำเนินการ, รอจัดซื้อ/หา, รอตรวจสอบ หรือ เสร็จสิ้น"),
        ("4. การลงลายมือชื่อดิจิทัลรับทราบ", "เมื่อช่างเข้ามาดูงานหรือทำงานเสร็จ ผู้แจ้งสามารถเปิดหน้าใบงาน แล้วกดปุ่ม '✍️ ลงนามรับทราบ' วาดลายเซ็น ระบุชื่อ และรหัสพนักงาน (ลงนามไว้ก่อนหรือหลังช่างทำเสร็จได้)")
    ]
    for title, desc in req_steps:
        p_t = tf_req.add_paragraph()
        p_t.text = f"• {title}"
        p_t.font.bold = True
        p_t.font.size = Pt(11.5)
        p_t.font.color.rgb = PRIMARY_DARK
        p_t.font.name = "Tahoma"
        p_d = tf_req.add_paragraph()
        p_d.text = f"   {desc}"
        p_d.font.size = Pt(10.5)
        p_d.font.color.rgb = TEXT_MUTED
        p_d.font.name = "Tahoma"
        p_d.space_after = Pt(8)

    # Right: Realistic Scenario Box
    add_card(s4, Inches(7.8), Inches(1.65), Inches(4.7), Inches(5.2), bg_color=PRIMARY_LIGHT, border_color=PRIMARY)
    tb_scen1 = s4.shapes.add_textbox(Inches(8.1), Inches(1.85), Inches(4.1), Inches(4.8))
    tf_scen1 = tb_scen1.text_frame
    tf_scen1.word_wrap = True
    ps_t = tf_scen1.paragraphs[0]
    ps_t.text = "ตัวอย่างสถานการณ์จริง: ผู้แจ้งงาน"
    ps_t.font.size = Pt(14)
    ps_t.font.bold = True
    ps_t.font.color.rgb = PRIMARY
    ps_t.font.name = "Tahoma"
    ps_t.space_after = Pt(10)

    scenario_text = (
        "📍 สถานการณ์:\n"
        "คุณกนกวรรณ (ฝ่ายบัญชี ชั้น 3) พบว่าเครื่องปรับอากาศมีน้ำหยดลงโต๊ะทำงาน\n\n"
        "1. คุณกนกวรรณเข้าเมนู FM กด 'สร้างใบงานใหม่'\n"
        "2. กรอกหัวข้อ: 'แอร์มีน้ำหยด แผนกบัญชี ชั้น 3'\n"
        "3. แนบรูปถ่ายแอร์ที่มีน้ำหยด 2 รูป\n"
        "4. เมื่อช่างเข้าตรวจสอบ คุณกนกวรรณกด 'ลงนามรับทราบ' วาดลายมือชื่อพร้อมใส่รหัสพนักงาน EMP-104\n"
        "5. ระบบบันทึกลายเซ็น พร้อมแสดงวันที่และเวลาลงนามทันที"
    )
    ps_c = tf_scen1.add_paragraph()
    ps_c.text = scenario_text
    ps_c.font.size = Pt(11)
    ps_c.font.color.rgb = PRIMARY_DARK
    ps_c.font.name = "Tahoma"

    # =========================================================================
    # SLIDE 5: ฝั่งช่างผู้ดำเนินการ (Main Users / Technicians)
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5, BG_LIGHT)
    add_header(s5, "คู่มือการใช้งาน: ฝั่งช่างผู้ดำเนินการ (การรับงาน & เบิกของ)", "Role: Technician Guide", 5)

    # 3 Work Flow Columns for Technician
    tech_columns = [
        ("ขั้นตอนที่ 1: การรับงาน", "Auto Performer Claim", [
            "เข้าเมนู FM กดปุ่มแท็บ 'รอดำเนินการ'",
            "กดเปิดดูใบแจ้งงานที่ต้องการ",
            "หากยังไม่มีผู้ดำเนินการ ระบบจะมีปุ่ม 'รับดำเนินการใบงานนี้'",
            "เมื่อกดรับ ระบบจะดึงชื่อ นามสกุล และสังกัดของช่างจากบัญชีที่ Login อัตโนมัติ (ไม่ต้องพิมพ์เอง)",
            "เอกสารใบงานเดิมก่อนหน้านี้จะถูกเว้นว่างไว้จนกว่าจะมีช่างเข้ามารับงาน"
        ], PRIMARY),
        ("ขั้นตอนที่ 2ก: เบิกใช้อุปกรณ์", "Requisition from Inventory", [
            "ค้นหาอุปกรณ์ในคลังสต็อกที่แสดงในหน้าใบงาน",
            "ดูจำนวนคงเหลือแบบ Real-time ก่อนเบิก",
            "กดปุ่ม '+' เพื่อเพิ่มรายการอุปกรณ์ที่ต้องใช้",
            "ระบุจำนวนและบันทึกหมายเหตุอุปกรณ์",
            "กดปุ่ม 'ส่งรายการอุปกรณ์รอตรวจสอบ'",
            "ใบงานจะเปลี่ยนสถานะเป็น 'รอตรวจสอบ' เพื่อรอแอดมินอนุมัติตัดสต็อก"
        ], ACCENT_GREEN),
        ("ขั้นตอนที่ 2ข: ไม่ใช้อุปกรณ์", "Complete Without Items", [
            "กรณีเป็นงานบริการ ตรวจเช็ค หรือขันน็อต ที่ไม่มีการเบิกพัสดุใดๆ",
            "ไม่ต้องเลือกอุปกรณ์ในรายการ",
            "กดปุ่ม 'ดำเนินการแล้ว (ไม่เบิกของ)'",
            "ระบบจะเปลี่ยนสถานะเป็น 'รอตรวจสอบ' ให้แอดมินปิดงานได้ทันที",
            "ลดขั้นตอนการเปิดใบเบิกที่เกินความจำเป็น"
        ], PRIMARY_DARK)
    ]

    for idx, (col_title, col_sub, points, col_color) in enumerate(tech_columns):
        cx = Inches(0.8 + idx * 3.9)
        add_card(s5, cx, Inches(1.65), Inches(3.7), Inches(5.2))
        
        # Top banner
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
    # SLIDE 6: ฝั่งช่าง: กรณีอุปกรณ์ไม่พอ / ต้องรอจัดซื้อ
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6, BG_LIGHT)
    add_header(s6, "คู่มือการใช้งาน: ฝั่งช่าง กรณีต้องรอจัดซื้อ / รอของ", "Role: Waiting Parts Handling", 6)

    add_card(s6, Inches(0.8), Inches(1.65), Inches(6.8), Inches(5.2))
    tb_wp = s6.shapes.add_textbox(Inches(1.1), Inches(1.85), Inches(6.2), Inches(4.8))
    tf_wp = tb_wp.text_frame
    tf_wp.word_wrap = True
    
    p = tf_wp.paragraphs[0]
    p.text = "ขั้นตอนการจัดการใบงานเมื่ออะไหล่หมดหรือต้องสั่งซื้อเพิ่ม"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = ACCENT_AMBER
    p.font.name = "Tahoma"
    p.space_after = Pt(12)

    wp_steps = [
        ("1. เมื่อตรวจสอบแล้วพบว่าไม่มีอะไหล่ในสต็อก", "ในหน้าใบงาน FM ให้กดปุ่มสีส้ม 'รอของ (จัดซื้อ/หาอุปกรณ์)'"),
        ("2. กรอกระบุรายการที่ต้องการสั่งซื้อ", "ระบบจะเปิดหน้าต่างให้พิมพ์ระบุรายการ เช่น 'สายไฟ VAF 2x2.5 ยาว 50 เมตร' หรือ 'ลูกลอยชักโครก 1/2 นิ้ว'"),
        ("3. สถานะใบงานจะเปลี่ยนเป็น 'รอจัดซื้อ/หา (ข้อความ)'", "บนหน้ารายการใบงานและรายงานสรุปจะย่อสถานะให้อ่านง่าย เช่น 'รอจัดซื้อ/หา (หลอดไฟ LED)'"),
        ("4. การเปลี่ยนสถานะกลับเป็น 'รอดำเนินการ' เมื่องของมาถึง", "เมื่อพัสดุมาส่ง ช่างสามารถเข้าใบงานเดิมแล้วกดปุ่ม 'เปลี่ยนกลับเป็นรอดำเนินการ' เพื่อดำเนินการซ่อมต่อและเบิกของตามปกติ")
    ]
    for title, desc in wp_steps:
        p_t = tf_wp.add_paragraph()
        p_t.text = f"• {title}"
        p_t.font.bold = True
        p_t.font.size = Pt(11.5)
        p_t.font.color.rgb = PRIMARY_DARK
        p_t.font.name = "Tahoma"
        p_d = tf_wp.add_paragraph()
        p_d.text = f"   {desc}"
        p_d.font.size = Pt(10.5)
        p_d.font.color.rgb = TEXT_MUTED
        p_d.font.name = "Tahoma"
        p_d.space_after = Pt(10)

    # Right: Real Scenario Box
    add_card(s6, Inches(7.8), Inches(1.65), Inches(4.7), Inches(5.2), bg_color=RGBColor(254, 243, 199), border_color=ACCENT_AMBER)
    tb_scen2 = s6.shapes.add_textbox(Inches(8.1), Inches(1.85), Inches(4.1), Inches(4.8))
    tf_scen2 = tb_scen2.text_frame
    tf_scen2.word_wrap = True
    ps_t = tf_scen2.paragraphs[0]
    ps_t.text = "ตัวอย่างสถานการณ์จริง: การรอของ"
    ps_t.font.size = Pt(14)
    ps_t.font.bold = True
    ps_t.font.color.rgb = ACCENT_AMBER
    ps_t.font.name = "Tahoma"
    ps_t.space_after = Pt(10)

    scenario_text2 = (
        "📍 สถานการณ์:\n"
        "ช่างสมพงษ์ ได้รับมอบหมายงานซ่อมปั๊มน้ำอาคาร 2 พบว่าซีลยางและแมคคานิคอลซีลรั่วซึม ซึ่งไม่มีสำรองในคลัง\n\n"
        "1. ช่างสมพงษ์กดปุ่ม 'รอของ (จัดซื้อ/หาอุปกรณ์)'\n"
        "2. พิมพ์ระบุ: 'แมคคานิคอลซีล 25mm รุ่น CR-3'\n"
        "3. ใบงานแสดงสถานะ: 'รอจัดซื้อ/หา (แมคคานิคอลซีล 25mm)' ทันที\n"
        "4. ฝ่ายจัดซื้อและผู้แจ้งเห็นสถานะชัดเจนว่าติดรอของอะไร\n"
        "5. เมื่ออะไหล่มาถึง ช่างสมพงษ์กดเปลี่ยนกลับเป็น 'รอดำเนินการ' เข้าติดตั้ง และปิดใบงาน"
    )
    ps_c = tf_scen2.add_paragraph()
    ps_c.text = scenario_text2
    ps_c.font.size = Pt(11)
    ps_c.font.color.rgb = PRIMARY_DARK
    ps_c.font.name = "Tahoma"

    # =========================================================================
    # SLIDE 7: ฝั่งผู้ตรวจสอบ (แอดมิน / ผู้จัดการ)
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7, BG_LIGHT)
    add_header(s7, "คู่มือการใช้งาน: ฝั่งผู้ตรวจสอบ (Admin Review & Stock Approval)", "Role: Admin Reviewer", 7)

    admin_steps = [
        ("1. การแจ้งเตือน & แถบ Banner สีส้ม", "เมื่อช่างส่งรายการอุปกรณ์ ระบบจะแสดงแถบ Banner ด้านบนทันทีว่า 'มีใบงานรอตรวจสอบและอนุมัติ X รายการ' พร้อมส่งแจ้งเตือนผ่าน LINE Notify", PRIMARY),
        ("2. ตรวจสอบ & ปรับแต่งรายการอุปกรณ์", "แอดมินสามารถตรวจสอบรายการที่ช่างขอเบิก หากจำนวนไม่ถูกต้อง สามารถแก้ไขจำนวน หรือกดเพิ่ม/ลบรายการอุปกรณ์ก่อนอนุมัติได้โดยตรง", PRIMARY),
        ("3. อนุมัติตัดสต็อกอัตโนมัติ (1-Click)", "เมื่อกดยืนยันอนุมัติ ระบบจะตัดยอดคงเหลือในคลังพัสดุทันที และบันทึกประวัติ Stock Movement ประเภท Requisition ให้เรียบร้อย", ACCENT_GREEN),
        ("4. ปิดสถานะ 'เสร็จสิ้น' พร้อมลงวันที่", "ระบบเปลี่ยนสถานะใบงานเป็น 'เสร็จสิ้น' และบันทึก Timestamp วันที่เสร็จสิ้นอัตโนมัติ เพื่อนำไปแสดงในรายงาน", ACCENT_GREEN)
    ]
    for idx, (atitle, adesc, acolor) in enumerate(admin_steps):
        col = idx % 2
        row = idx // 2
        ax = Inches(0.8 + col * 5.9)
        ay = Inches(1.65 + row * 2.6)
        add_card(s7, ax, ay, Inches(5.7), Inches(2.35))
        
        # Color top strip
        strip = s7.shapes.add_shape(MSO_SHAPE.RECTANGLE, ax, ay, Inches(5.7), Inches(0.12))
        strip.fill.solid()
        strip.fill.fore_color.rgb = acolor
        strip.line.fill.background()

        tb = s7.shapes.add_textbox(ax + Inches(0.3), ay + Inches(0.3), Inches(5.1), Inches(1.8))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = atitle
        p.font.size = Pt(13.5)
        p.font.bold = True
        p.font.color.rgb = acolor
        p.font.name = "Tahoma"
        p.space_after = Pt(8)
        p2 = tf.add_paragraph()
        p2.text = adesc
        p2.font.size = Pt(11)
        p2.font.color.rgb = TEXT_MUTED
        p2.font.name = "Tahoma"

    # =========================================================================
    # SLIDE 8: สิทธิ์พิเศษของผู้ดูแลระบบ (Admin Controls & Overrides)
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
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    p.font.name = "Tahoma"
    p.space_after = Pt(12)

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
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = ACCENT_AMBER
    p.font.name = "Tahoma"
    p.space_after = Pt(12)

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
        
        # Header Box
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

    # Left: SFM Printing
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
    p.space_after = Pt(12)

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

    # Right: Summary Reports (PDF / Excel)
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
    p.space_after = Pt(12)

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
    # SLIDE 11: ตารางสรุปสิทธิ์การใช้งาน (Role & Permission Matrix)
    # =========================================================================
    s11 = prs.slides.add_slide(blank_layout)
    set_slide_background(s11, BG_LIGHT)
    add_header(s11, "ตารางสรุปหน้าที่และความรับผิดชอบ (Role & Permission Matrix)", "Governance & Permissions", 11)

    # Table
    table_shape = s11.shapes.add_table(7, 4, Inches(0.8), Inches(1.7), Inches(11.7), Inches(5.0))
    table = table_shape.table
    table.columns[0].width = Inches(3.9)
    table.columns[1].width = Inches(2.6)
    table.columns[2].width = Inches(2.6)
    table.columns[3].width = Inches(2.6)

    headers_matrix = ["ฟังก์ชัน / การดำเนินการ", "ผู้แจ้งงาน (Requester)", "ช่างผู้ดำเนินการ (Tech)", "ผู้ดูแลระบบ (Admin)"]
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
        ("สร้างใบแจ้งงานซ่อม / อัปโหลดรูปภาพ", "✔️ สร้างได้", "✔️ สร้างได้", "✔️ สร้างได้"),
        ("กดรับดำเนินการใบงาน (Auto Performer)", "—", "✔️ กดรับงานตนเอง", "✔️ กำหนดช่างได้"),
        ("ระบุขอเบิกอุปกรณ์ / แจ้งรอจัดซื้อ / จบงานไม่เบิกของ", "—", "✔️ ทำรายการได้", "✔️ ทำรายการได้"),
        ("ลงนามรับทราบการดำเนินการ (Digital Signature)", "✔️ ลงนามรับทราบ", "—", "✔️ ลงนามแทนได้"),
        ("อนุมัติตัดสต็อกพัสดุในคลัง (Auto Deduct Stock)", "—", "—", "✔️ มีสิทธิ์อนุมัติเท่านั้น"),
        ("แก้ไขข้อมูลใบงาน & ปรับสถานะ Overrides ทุกสถานะ", "—", "—", "✔️ สิทธิ์เฉพาะ Admin"),
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
                    p.font.color.rgb = PRIMARY if "Admin" not in val else ACCENT_GREEN
                else:
                    p.font.color.rgb = TEXT_MUTED
            else:
                p.font.bold = True
                p.font.color.rgb = PRIMARY_DARK

    # =========================================================================
    # SLIDE 12: สรุปประโยชน์และคำแนะนำ (Summary & Support)
    # =========================================================================
    s12 = prs.slides.add_slide(blank_layout)
    set_slide_background(s12, PRIMARY_DARK)
    
    # Header on dark
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
        ("สต็อกตรง ไม่สูญหาย", "ทุกชิ้นพัสดุที่ใช้ในงานซ่อมถูกบันทึกและตัดสต็อกอย่างถูกต้อง มีหลักฐานอ้างอิงถึงใบงาน FM เสมอ", ACCENT_GREEN),
        ("สื่อสารตรงกันทุกฝ่าย", "ผู้แจ้ง ช่าง และแอดมิน มองเห็นสถานะเดียวกันแบบ Real-time ลดการโทรตามงาน", PRIMARY),
        ("ประหยัดเวลาการทำงาน", "ช่างไม่ต้องกรอกเอกสารกระดาษ สามารถเลือกอุปกรณ์และส่งตรวจผ่านมือถือหรือคอมพิวเตอร์ได้ทันที", ACCENT_AMBER),
        ("รายงานและตรวจสอบย้อนหลัง", "ผู้บริหารสามารถตรวจสอบประวัติการซ่อมบำรุงและต้นทุนพัสดุที่ใช้ย้อนหลังได้ตลอดเวลา", RGBColor(168, 85, 247))
    ]

    for idx, (btitle, bdesc, bcol) in enumerate(benefits):
        bx = Inches(0.8 + idx * 2.95)
        add_card(s12, bx, Inches(1.85), Inches(2.8), Inches(4.8), bg_color=RGBColor(30, 41, 59), border_color=bcol)
        
        # Indicator badge
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

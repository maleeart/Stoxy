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

    b_badge = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(1.3), Inches(3.4), Inches(0.45))
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

    t1_box = s1.shapes.add_textbox(Inches(1.2), Inches(2.0), Inches(11.2), Inches(2.3))
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
    p1_sub.text = "นำเข้าไฟล์ FM เดิม (ถือเป็นรับงานทันที) • ช่างปฏิบัติงานและยื่นมือถือให้ลงนาม • ผู้ควบคุมงานอนุมัติตัดสต็อก"
    p1_sub.font.size = Pt(15)
    p1_sub.font.color.rgb = RGBColor(148, 163, 184)
    p1_sub.font.name = "Tahoma"

    roles_info = [
        ("ผู้ควบคุมงาน (Admin / Supervisor)", "นำเข้าไฟล์ FM เดิมที่รับงานแล้วเข้าสู่แอพ (ถือเป็นรับงานทันที), ตรวจสอบรายการอุปกรณ์ และอนุมัติตัดสต็อก", PRIMARY),
        ("ช่างผู้ปฏิบัติงาน (Technician)", "รับผิดชอบงานหน้างาน, จัดการพัสดุตาม 3 กรณี, ยื่นมือถือให้เจ้าของบริเวณเซ็นรับทราบผลงาน", ACCENT_AMBER),
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
        pt.font.size = Pt(12)
        pt.font.bold = True
        pt.font.color.rgb = TEXT_WHITE
        pt.font.name = "Tahoma"
        pt.space_after = Pt(6)
        pd = tf.add_paragraph()
        pd.text = rdesc
        pd.font.size = Pt(9.5)
        pd.font.color.rgb = RGBColor(203, 213, 225)
        pd.font.name = "Tahoma"

    # =========================================================================
    # SLIDE 2: บทบาทหน้าที่และการปฏิบัติงานร่วมกัน
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2, BG_LIGHT)
    add_header(s2, "บทบาทหน้าที่และการปฏิบัติงานร่วมกัน (Operational Alignment)", "Core Concepts", 2)

    boxes = [
        ("1. สร้างใบ FM = ถือเป็นการรับงานทันที", "ผู้ควบคุมงานนำเข้าข้อมูลหรืออัปโหลดไฟล์ FM จากระบบเดิม ซึ่งในระบบเดิมได้รับการรับงาน/อนุมัติมาเรียบร้อยแล้ว ดังนั้นการสร้างใบงานในแอพนี้จึงถือเป็นการรับงานเข้าสู่ทีมซ่อมบำรุงในภาพรวมทันที", PRIMARY),
        ("2. ช่างรับดำเนินการ & ระบุตัวผู้รับผิดชอบ", "ใบงานจะขึ้นในแท็บ 'รอดำเนินการ' ช่างผู้จะลงมือซ่อมกดปุ่ม 'รับดำเนินการ' เพื่อผูกชื่อและสังกัดตนเองลงในใบงานอัตโนมัติ ทำให้ทราบชัดเจนว่าช่างท่านใดเป็นผู้ดูแลเคสนี้", PRIMARY_DARK),
        ("3. ช่างลงพื้นที่ปฏิบัติงาน (แยก 3 กรณี)", "ช่างเข้าแก้ปัญหาหน้างานจริงตาม 3 รูปแบบ: กรณี A มีอะไหล่เบิกคลัง / กรณี B เสร็จโดยไม่เบิกของ (ซ่อมเสร็จ เซ็นชื่อ แล้วกดเสร็จไม่เบิก) / กรณี C รอซื้อ (ระบุเลขอ้างอิง REP จากระบบ veri)", ACCENT_AMBER),
        ("4. ยื่นมือถือให้เจ้าของบริเวณลงนามหน้างาน", "เมื่อซ่อมเสร็จ ช่างจะเปิดหน้าใบงานบนมือถือตนเอง แล้วยื่นให้เจ้าของบริเวณหรือผู้ทำการแทนเซ็นลายมือชื่อตรวจรับงานเสร็จสิ้นหน้างาน (ระบุชื่อ + รหัสพนักงาน) ก่อนส่งอนุมัติปิดงาน", ACCENT_GREEN)
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
    # SLIDE 3: ไทม์ไลน์ภาพรวม 6 ขั้นตอน
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3, BG_LIGHT)
    add_header(s3, "ไทม์ไลน์ลำดับขั้นตอนการปฏิบัติงานหน้างานจริง (Workflow Timeline)", "Field Workflow Timeline", 3)

    steps = [
        ("ขั้นตอนที่ 1", "สร้าง FM (รับงานทันที)", "ผู้ควบคุมงานนำเข้าไฟล์ FM เดิมที่รับงานแล้วเข้าสู่แอพ ถือว่ารับงานทันที สถานะ: รอดำเนินการ", PRIMARY),
        ("ขั้นตอนที่ 2", "ช่างรับดำเนินการ", "ช่างเข้าดูใบงานในคิว กดปุ่ม 'รับดำเนินการ' เพื่อผูกชื่อ-นามสกุล และสังกัดตนเองเข้าใบงาน", PRIMARY),
        ("ขั้นตอนที่ 3", "ปฏิบัติงาน & จัดการพัสดุ", "ช่างไปหน้างาน: เบิกพัสดุ (มีรูปประกอบ) หรือ เสร็จโดยไม่เบิกของ หรือ รอซื้อ (ระบุเลข REP)", ACCENT_AMBER),
        ("ขั้นตอนที่ 4", "ผู้แจ้งลงนามบนมือถือช่าง", "ช่างยื่นมือถือให้เจ้าของบริเวณเซ็นชื่อดิจิทัล + รหัสพนักงาน ยืนยันผลการดำเนินงานเสร็จสิ้น", ACCENT_GREEN),
        ("ขั้นตอนที่ 5", "ผู้ควบคุมงานอนุมัติปิดงาน", "ผู้ควบคุมงาน (คนเดียวกับข้อ 1) ตรวจสอบความถูกต้อง กดยืนยันอนุมัติตัดสต็อกปิดงาน 'เสร็จสิ้น'", ACCENT_GREEN),
        ("ขั้นตอนที่ 6", "พิมพ์ & สรุปรายงาน", "พิมพ์แบบฟอร์ม SFM เดี่ยว หรือ Export รายงานประจำเดือน (แสดงวันที่เสร็จสิ้น / ย่อรอจัดซื้อ+REP)", PRIMARY_DARK),
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
    # SLIDE 4: ขั้นตอนที่ 1 & 2 - สร้างใบ FM (นำเข้าไฟล์เดิม) และช่างรับดำเนินการ
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4, BG_LIGHT)
    add_header(s4, "ขั้นตอนที่ 1 & 2: นำเข้าไฟล์ FM เดิม (รับงานทันที) และช่างรับดำเนินการ", "Step 1 & 2: Legacy Import & Assignment", 4)

    add_card(s4, Inches(0.8), Inches(1.65), Inches(5.7), Inches(5.2))
    tb_c1 = s4.shapes.add_textbox(Inches(1.1), Inches(1.9), Inches(5.1), Inches(4.7))
    tf_c1 = tb_c1.text_frame
    tf_c1.word_wrap = True
    p = tf_c1.paragraphs[0]
    p.text = "1. สร้างใบ FM นำเข้าจากระบบเดิม (ถือเป็นรับงานทันที)"
    p.font.size = Pt(13.5)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    p.font.name = "Tahoma"
    p.space_after = Pt(10)

    c1_items = [
        "ที่มา: เอกสารใบงาน FM ได้รับการอนุมัติและรับงานมาจากระบบเดิมเรียบร้อยแล้ว",
        "ผู้ควบคุมงานนำเข้าข้อมูลโดยอัปโหลดไฟล์ FM เดิม หรือสแกน OCR เข้าสู่แอพ Stoxy",
        "การสร้างใบงานในขั้นตอนนี้จึง 'ถือว่ารับงานเข้าสู่ทีมซ่อมบำรุงแล้วทันที' โดยมีสถานะตั้งต้นเป็น 'รอดำเนินการ'",
        "ระบุชื่อ 'ผู้มอบหมายงาน' (Supervisor/Admin ผู้ควบคุม)",
        "แนบรูปถ่ายสภาพหน้างานจริง (สูงสุด 3 รูป พร้อมบีบอัดรูปอัตโนมัติ) เพื่อให้ช่างเห็นอาการและจัดเตรียมเครื่องมือได้ตรงจุด",
        "ไม่ต้องมีขั้นตอนรอเปิด-รออนุมัติรับงานซ้ำซ้อน ช่างพร้อมเริ่มงานได้ทันที"
    ]
    for it in c1_items:
        pt = tf_c1.add_paragraph()
        pt.text = f"• {it}"
        pt.font.size = Pt(10)
        pt.font.color.rgb = TEXT_DARK
        pt.font.name = "Tahoma"
        pt.space_after = Pt(6)

    add_card(s4, Inches(6.8), Inches(1.65), Inches(5.7), Inches(5.2))
    tb_c2 = s4.shapes.add_textbox(Inches(7.1), Inches(1.9), Inches(5.1), Inches(4.7))
    tf_c2 = tb_c2.text_frame
    tf_c2.word_wrap = True
    p = tf_c2.paragraphs[0]
    p.text = "2. ช่างรับดำเนินการ (ระบุตัวช่างผู้รับผิดชอบ)"
    p.font.size = Pt(13.5)
    p.font.bold = True
    p.font.color.rgb = PRIMARY_DARK
    p.font.name = "Tahoma"
    p.space_after = Pt(10)

    c2_items = [
        "ช่างทีมซ่อมบำรุงเข้าดูงานใหม่ในแท็บ 'รอดำเนินการ' หรือกดปุ่มลัด 'งานของฉัน'",
        "ช่างผู้จะลงมือซ่อมเปิดใบงานแล้วกดปุ่ม 'รับดำเนินการใบงานนี้'",
        "ระบบดึงชื่อ-นามสกุล และหน่วยงานสังกัดของช่างจากบัญชีที่ Login มาบันทึกลงใบงานอัตโนมัติ (ช่างไม่ต้องเสียเวลาพิมพ์)",
        "ช่วยให้ผู้ควบคุมงานและผู้แจ้งงานทราบชัดเจนว่าช่างท่านใดเป็นผู้รับผิดชอบเคสนี้",
        "สำหรับเอกสารเดิมที่เปิดไว้ก่อนหน้านี้ ระบบจะเว้นว่างชื่อช่างไว้ เพื่อรอช่างเข้ามากดรับงานตามจริง (ไม่แสดงข้อความค้างในวงเล็บ)"
    ]
    for it in c2_items:
        pt = tf_c2.add_paragraph()
        pt.text = f"• {it}"
        pt.font.size = Pt(10)
        pt.font.color.rgb = TEXT_DARK
        pt.font.name = "Tahoma"
        pt.space_after = Pt(6)

    # =========================================================================
    # SLIDE 5: ขั้นตอนที่ 3 & 4 - ลำดับการทำงานแยกตาม 3 กรณีหน้างานจริง
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5, BG_LIGHT)
    add_header(s5, "ขั้นตอนที่ 3 & 4: ลำดับการทำงานแยกตาม 3 กรณีหน้างานจริง (Cases A, B, C)", "Step 3 & 4: Field Workflows", 5)

    tech_columns = [
        ("กรณี A: มีอะไหล่เบิกคลัง", "มีอะไหล่พร้อมในคลังพัสดุ", [
            "1. ช่างลงพื้นที่ตรวจสอบและซ่อมแซมหน้างานจนเสร็จเรียบร้อย",
            "2. กด 'เลือกอุปกรณ์จากคลัง' (แสดงรูปภาพประกอบทุกรายการชัดเจน)",
            "3. ยื่นมือถือให้เจ้าของบริเวณตรวจดูผลงาน และลงนามรับทราบ + รหัสพนักงาน",
            "4. ช่างกด 'ส่งรายการรอตรวจสอบ' เพื่อให้ผู้ควบคุมงานอนุมัติตัดสต็อก",
            "📌 เหมาะกับ: งานซ่อมที่มีการเบิกใช้อะไหล่หรือวัสดุสิ้นเปลืองจากคลัง"
        ], PRIMARY),
        ("กรณี B: เสร็จโดยไม่เบิกของ", "งานบริการ ไม่ใช้อะไหล่", [
            "1. ช่างลงพื้นที่ดำเนินการแก้ไขหน้างานจริง (เช่น ปรับตั้งค่า, ล้างแอร์/ทำความสะอาด, ตรวจเช็ค, ขันน็อต)",
            "2. ไม่มีการเบิกพัสดุหรือใช้วัสดุสิ้นเปลืองใดๆ ในคลัง",
            "3. ช่างเปิดใบงานบนมือถือตนเอง ยื่นให้เจ้าของบริเวณตรวจดูผลงานและเซ็นชื่อรับทราบ + รหัสพนักงาน",
            "4. เมื่อลงนามเสร็จ ช่างกดปุ่ม 'ดำเนินการแล้ว (ไม่เบิกของ)'",
            "📌 เหมาะกับ: งานบริการที่ไม่ต้องตัดสต็อกพัสดุ ส่งอนุมัติปิดงานได้ทันที"
        ], ACCENT_GREEN),
        ("กรณี C: รอซื้อ (ใส่เลข REP)", "ไม่มีอะไหล่ในสต็อกคลัง", [
            "1. ช่างตรวจสอบพบว่าไม่มีอะไหล่ในสต็อกคลัง",
            "2. กดปุ่มสีส้ม 'รอของ (จัดซื้อ/หาอุปกรณ์)'",
            "3. ใส่หมายเหตุ: ระบุ 'หมายเลขใบเสนอแจ้งซ่อม REP-2569-XXX ตามแบบฟอร์มใน veri' และระบุของที่ต้องหา",
            "4. สถานะเปลี่ยนเป็น 'รอจัดซื้อ/หา: [ของ] (REP-2569-XXX)' (เจ้าของบริเวณยังไม่ต้องลงนาม)",
            "5. เมื่อของมาส่ง ช่างกด 'เปลี่ยนกลับเป็นรอดำเนินการ' -> ติดตั้งเสร็จ -> ยื่นมือถือให้เซ็นชื่อ -> ส่งตรวจ"
        ], ACCENT_AMBER)
    ]

    for idx, (col_title, col_sub, points, col_color) in enumerate(tech_columns):
        cx = Inches(0.8 + idx * 3.9)
        add_card(s5, cx, Inches(1.65), Inches(3.7), Inches(5.2))
        
        c_bar = s5.shapes.add_shape(MSO_SHAPE.RECTANGLE, cx, Inches(1.65), Inches(3.7), Inches(0.75))
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

        p_cbs = c_bar.text_frame.add_paragraph()
        p_cbs.text = col_sub
        p_cbs.alignment = PP_ALIGN.CENTER
        p_cbs.font.size = Pt(9.5)
        p_cbs.font.color.rgb = RGBColor(241, 245, 249)
        p_cbs.font.name = "Tahoma"

        tb = s5.shapes.add_textbox(cx + Inches(0.2), Inches(2.5), Inches(3.3), Inches(4.2))
        tf = tb.text_frame
        tf.word_wrap = True

        for p_idx, pt_text in enumerate(points):
            p_pt = tf.paragraphs[0] if p_idx == 0 else tf.add_paragraph()
            p_pt.text = pt_text
            p_pt.font.size = Pt(9.5)
            p_pt.font.color.rgb = PRIMARY_DARK if not pt_text.startswith("📌") else col_color
            p_pt.font.bold = pt_text.startswith("📌") or pt_text.startswith("1.") or pt_text.startswith("2.") or pt_text.startswith("3.") or pt_text.startswith("4.") or pt_text.startswith("5.")
            p_pt.font.name = "Tahoma"
            p_pt.space_after = Pt(6)

    # =========================================================================
    # SLIDE 6: ตัวอย่างประกอบจริงของขั้นตอนที่ 3 & 4 ชัดเจน
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6, BG_LIGHT)
    add_header(s6, "ตัวอย่างประกอบจริง: การปฏิบัติงานและลงนามในขั้นตอนที่ 3 & 4", "Step 3 & 4: Real-world Examples", 6)

    scenarios = [
        ("ตัวอย่างกรณี A: ซ่อมเสร็จ & เบิกของ", "FM-6090: ก๊อกน้ำอ่างล้างมือรั่ว (แผนกบัญชี)", [
            "1. ช่างสมชายไปหน้างาน ตรวจพบก๊อกน้ำรั่ว ดำเนินการเปลี่ยนก๊อกน้ำใหม่จนเสร็จเรียบร้อย",
            "2. เปิดใบงานบนมือถือ กด 'เลือกอุปกรณ์จากคลัง' ดูรูปภาพก๊อกน้ำชัดเจน เลือก 'ก๊อกน้ำอ่าง 1/2 นิ้ว x 1 อัน'",
            "3. ช่างกดปุ่ม '✍️ ลงนามรับทราบ' ยื่นมือถือให้คุณกนกวรรณ (ผู้แจ้ง) ตรวจดูน้ำไหลปกติ",
            "4. คุณกนกวรรณเซ็นชื่อด้วยนิ้วมือบนมือถือช่าง พิมพ์ชื่อ 'กนกวรรณ มีสุข' และรหัส 'EMP-084'",
            "5. ช่างกด 'ส่งรายการรอตรวจสอบ' -> ผู้ควบคุมงานตรวจสอบและอนุมัติตัดสต็อกปิดงาน"
        ], PRIMARY),
        ("ตัวอย่างกรณี B: เสร็จโดยไม่เบิกของ", "FM-6092: แอร์มีกลิ่นอับ & ล้างฟิลเตอร์ (ห้องประชุม 2)", [
            "1. ช่างสมศักดิ์ เข้าไปถอดล้างแผ่นกรองอากาศ เป่าคอยล์เย็น ฉีดสเปรย์ฆ่าเชื้อจนแอร์ทำงานปกติ ลมเย็นสดชื่น",
            "2. งานนี้เป็นงานบริการ ตรวจเช็คและทำความสะอาด ไม่มีการเบิกพัสดุหรือใช้วัสดุสิ้นเปลืองใดๆ",
            "3. ช่างกดปุ่ม '✍️ ลงนามรับทราบ' ยื่นมือถือให้คุณวิภา (ธุรการผู้แจ้งงาน) ตรวจดูความเรียบร้อย",
            "4. คุณวิภาเซ็นชื่อบนมือถือช่าง พิมพ์ชื่อ 'วิภา วงศ์สวัสดิ์' และรหัส 'EMP-102' แล้วกดบันทึก",
            "5. ช่างกดปุ่มสีเขียว 'ดำเนินการแล้ว (ไม่เบิกของ)' -> ส่งผู้ควบคุมงานอนุมัติปิดงานเสร็จสิ้นทันที"
        ], ACCENT_GREEN),
        ("ตัวอย่างกรณี C: รอซื้อ ระบุเลข REP", "FM-6095: มอเตอร์ประตูม้วนไฟฟ้าเสีย (โรงอาหาร)", [
            "1. ช่างตรวจพบมอเตอร์ไหม้ คลังไม่มีสต็อก จึงเปิดแบบฟอร์มขอซื้อในระบบ veri ได้เลข 'REP-2569-045'",
            "2. ช่างกดปุ่ม 'รอของ (จัดซื้อ/หาอุปกรณ์)' กรอกเลข REP 'REP-2569-045' และระบุ 'มอเตอร์ประตูม้วน 1 HP'",
            "3. ระบบแสดงสถานะ 'รอจัดซื้อ/หา: มอเตอร์ประตูม้วน 1 HP (REP-2569-045)' ในหน้าเว็บและรายงานสรุป",
            "4. เมื่อจัดซื้อส่งของมาถึง ช่างกดเปลี่ยนเป็นรอดำเนินการ นำมอเตอร์ไปติดตั้งจนประตูทำงานปกติ",
            "5. ช่างยื่นมือถือให้ผู้จัดการโรงอาหารเซ็นชื่อตรวจรับมอบงาน -> ส่งผู้ควบคุมงานอนุมัติตัดสต็อกปิดงาน"
        ], ACCENT_AMBER)
    ]

    for idx, (stitle, ssub, splist, scolor) in enumerate(scenarios):
        sx = Inches(0.8 + idx * 3.9)
        add_card(s6, sx, Inches(1.65), Inches(3.7), Inches(5.2))
        
        s_bar = s6.shapes.add_shape(MSO_SHAPE.RECTANGLE, sx, Inches(1.65), Inches(3.7), Inches(0.75))
        s_bar.fill.solid()
        s_bar.fill.fore_color.rgb = scolor
        s_bar.line.fill.background()

        p_sb = s_bar.text_frame.paragraphs[0]
        p_sb.text = stitle
        p_sb.alignment = PP_ALIGN.CENTER
        p_sb.font.size = Pt(11)
        p_sb.font.bold = True
        p_sb.font.color.rgb = TEXT_WHITE
        p_sb.font.name = "Tahoma"

        p_sbs = s_bar.text_frame.add_paragraph()
        p_sbs.text = ssub
        p_sbs.alignment = PP_ALIGN.CENTER
        p_sbs.font.size = Pt(9)
        p_sbs.font.color.rgb = RGBColor(241, 245, 249)
        p_sbs.font.name = "Tahoma"

        tb = s6.shapes.add_textbox(sx + Inches(0.2), Inches(2.5), Inches(3.3), Inches(4.2))
        tf = tb.text_frame
        tf.word_wrap = True

        for p_idx, pt_text in enumerate(splist):
            p_pt = tf.paragraphs[0] if p_idx == 0 else tf.add_paragraph()
            p_pt.text = pt_text
            p_pt.font.size = Pt(9.5)
            p_pt.font.color.rgb = PRIMARY_DARK
            p_pt.font.name = "Tahoma"
            p_pt.space_after = Pt(5)

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
        "แก้ไขข้อมูลอ้างอิง: หมายเลขใบเสนอแจ้งซ่อม REP ในระบบ veri และรายละเอียดรอซื้อ",
        "จัดการรูปภาพประกอบ: ลบรูปเดิมออก หรืออัปโหลดรูปใหม่เพิ่มเติม (รวมสูงสุดไม่เกิน 3 รูป)",
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
        ("หน้ารายการอุปกรณ์พร้อมรูปภาพ", "Visual Inventory Picker", [
            "หน้า 'เลือกอุปกรณ์จากคลัง' แสดงรูปภาพประกอบทุกรายการอย่างชัดเจน",
            "ช่วยให้ช่างเห็นรูปทรง สี และหน้าตาอะไหล่ก่อนกดเลือก ป้องกันการเบิกผิดรุ่น",
            "แสดงยอดคงเหลือในคลัง Real-time และตำแหน่งที่เก็บอุปกรณ์",
            "ปุ่มลัด 'งานของฉัน': กดเพื่อกรองดูเฉพาะงานที่ตนเองรับผิดชอบได้ทันทีในคลิกเดียว"
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
        "   - กรณี 'รอจัดซื้อ': ย่อเป็น รอจัดซื้อ/หา (ข้อความที่กรอก - REP-2569-XXX)",
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
        ("1. นำเข้าไฟล์ FM เดิม (ถือเป็นรับงานทันที)", "✔️ ผู้นำเข้า/ผู้สร้าง", "—", "รับเรื่องจากระบบเดิมแล้ว"),
        ("2. มอบหมายงาน / รับงานในภาพรวม", "✔️ ผู้มอบหมาย", "✔️ กดรับดำเนินการ", "—"),
        ("3. ปฏิบัติงาน / จัดการพัสดุ (3 กรณี)", "—", "✔️ ปฏิบัติงานจริง", "—"),
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
        ("ควบคุมงานเป็นระบบ", "นำเข้าไฟล์ FM เดิมที่รับงานแล้วเข้าสู่ระบบ Stoxy ได้ทันที ลดความซ้ำซ้อน งานไม่ตกหล่น และมีผู้รับผิดชอบชัดเจน", PRIMARY),
        ("หลักฐานตรวจรับหน้างานจริง", "ช่างนำมือถือไปให้เจ้าของพื้นที่ตรวจงานและเซ็นรับทราบทันที มีรูปภาพอุปกรณ์ให้ดูประกอบตอนเบิกพัสดุ", ACCENT_GREEN),
        ("เชื่อมโยงระบบจัดซื้อ (veri)", "รองรับการระบุเลขที่ใบเสนอแจ้งซ่อม REP-2569-XXX เพื่อเตรียมพร้อมการควบรวม 2 ระบบเข้าด้วยกันในอนาคต", ACCENT_AMBER),
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

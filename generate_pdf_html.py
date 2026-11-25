import os
import subprocess

html_content = """<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>คู่มือการใช้งานระบบใบแจ้งงานซ่อม (FM) - Stoxy System</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');

  @page {
    size: 297mm 167.06mm; /* 16:9 Presentation Landscape */
    margin: 0;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Sarabun', 'Tahoma', sans-serif;
    background: #0f172a;
    color: #0f172a;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .slide {
    width: 297mm;
    height: 167.06mm;
    position: relative;
    page-break-after: always;
    page-break-inside: avoid;
    overflow: hidden;
    padding: 15mm 18mm;
    background: #f8fafc;
    display: flex;
    flex-direction: column;
  }

  .slide.dark {
    background: #0f172a;
    color: #ffffff;
  }

  /* Slide Header */
  .slide-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 6mm;
    position: relative;
  }

  .header-left .category-tag {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #1d4ed8;
    margin-bottom: 1.5mm;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .slide.dark .category-tag {
    color: #60a5fa;
  }

  .category-tag::before {
    content: '';
    display: inline-block;
    width: 12px;
    height: 4px;
    background: #1d4ed8;
    border-radius: 2px;
  }
  .slide.dark .category-tag::before {
    background: #60a5fa;
  }

  .header-left .slide-title {
    font-size: 23px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
  }
  .slide.dark .slide-title {
    color: #ffffff;
  }

  .slide-page-num {
    font-size: 13px;
    font-weight: 700;
    color: #94a3b8;
  }

  /* Content Containers */
  .content-area {
    flex: 1;
    display: flex;
    gap: 5mm;
  }

  /* Cards */
  .card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 4.5mm 5.5mm;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  }

  .card.dark {
    background: #1e293b;
    border-color: #334155;
    color: #ffffff;
  }

  .card-title {
    font-size: 14.5px;
    font-weight: 700;
    margin-bottom: 2.5mm;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 700;
  }
  .badge-blue { background: #eff6ff; color: #1d4ed8; }
  .badge-green { background: #ecfdf5; color: #047857; }
  .badge-amber { background: #fffbeb; color: #b45309; }

  /* Timeline */
  .timeline-container {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 3.5mm;
    width: 100%;
    height: 100%;
  }

  .timeline-step {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 3.5mm;
    display: flex;
    flex-direction: column;
    position: relative;
    border-top: 4px solid #1d4ed8;
  }

  .timeline-step .step-badge {
    font-size: 10px;
    font-weight: 800;
    padding: 2.5px 6px;
    border-radius: 6px;
    margin-bottom: 2.5mm;
    text-align: center;
    color: #ffffff;
  }

  .timeline-step h4 {
    font-size: 12.5px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 2mm;
  }

  .timeline-step p {
    font-size: 10px;
    color: #64748b;
    line-height: 1.45;
  }

  /* Grids */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5mm;
    width: 100%;
  }

  .grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4.5mm;
    width: 100%;
  }

  .grid-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4.5mm;
    width: 100%;
  }

  ul.check-list {
    list-style: none;
  }

  ul.check-list li {
    font-size: 11px;
    color: #334155;
    margin-bottom: 2mm;
    line-height: 1.45;
    position: relative;
    padding-left: 18px;
  }

  .slide.dark ul.check-list li {
    color: #cbd5e1;
  }

  ul.check-list li::before {
    content: "✓";
    position: absolute;
    left: 0;
    top: 0;
    color: #1d4ed8;
    font-weight: 800;
  }
  .slide.dark ul.check-list li::before {
    color: #60a5fa;
  }

  .scenario-box {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 12px;
    padding: 4mm 5mm;
  }

  .scenario-box.green {
    background: #f0fdf4;
    border-color: #bbf7d0;
  }

  .scenario-box.amber {
    background: #fffbeb;
    border-color: #fde68a;
  }

  .scenario-title {
    font-size: 12.5px;
    font-weight: 700;
    color: #1d4ed8;
    margin-bottom: 2mm;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .scenario-box.green .scenario-title { color: #15803d; }
  .scenario-box.amber .scenario-title { color: #b45309; }

  .scenario-text {
    font-size: 10.5px;
    color: #1e293b;
    line-height: 1.45;
  }

  /* Table styling */
  table.matrix-table {
    width: 100%;
    border-collapse: collapse;
    background: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    font-size: 11px;
  }

  table.matrix-table th {
    background: #1d4ed8;
    color: #ffffff;
    font-weight: 700;
    padding: 3mm 4mm;
    text-align: left;
  }

  table.matrix-table td {
    padding: 3.2mm 4mm;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
  }

  table.matrix-table tr:nth-child(even) td {
    background: #f8fafc;
  }

  table.matrix-table td.center {
    text-align: center;
  }

  .text-yes { color: #047857; font-weight: 700; }
  .text-no { color: #94a3b8; }
</style>
</head>
<body>

<!-- SLIDE 1: Cover Slide -->
<div class="slide dark" style="justify-content: center; align-items: flex-start; padding-left: 24mm;">
  <div style="background: #1d4ed8; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 8px; margin-bottom: 5mm; letter-spacing: 1px;">
    STOXY FACILITY MANAGEMENT SYSTEM
  </div>
  <h1 style="font-size: 32px; font-weight: 800; line-height: 1.25; margin-bottom: 3.5mm; color: #ffffff;">
    คู่มือการใช้งานระบบใบแจ้งงานซ่อม (FM)<br>และขั้นตอนการปฏิบัติงานหน้างานจริง
  </h1>
  <p style="font-size: 15px; color: #94a3b8; margin-bottom: 8mm; font-weight: 400;">
    ผู้ควบคุมงาน (Admin) สร้างและอนุมัติ • ช่างปฏิบัติงานหน้างานและยื่นมือถือให้ลงนาม • เจ้าของบริเวณตรวจรับงาน
  </p>

  <div style="display: flex; gap: 5mm; width: 252mm;">
    <div style="flex: 1; background: #1e293b; border-left: 4px solid #1d4ed8; border-radius: 10px; padding: 4mm 4.5mm;">
      <h3 style="font-size: 13.5px; font-weight: 700; color: #60a5fa; margin-bottom: 1.5mm;">1. ผู้ควบคุมงาน (Admin / Supervisor)</h3>
      <p style="font-size: 10.5px; color: #cbd5e1; line-height: 1.45;">เป็นผู้สร้างใบงาน, มอบหมายงานให้ช่างในภาพรวม, ตรวจสอบรายการอุปกรณ์ และอนุมัติตัดสต็อกปิดงาน</p>
    </div>
    <div style="flex: 1; background: #1e293b; border-left: 4px solid #f59e0b; border-radius: 10px; padding: 4mm 4.5mm;">
      <h3 style="font-size: 13.5px; font-weight: 700; color: #fbbf24; margin-bottom: 1.5mm;">2. ช่างผู้ปฏิบัติงาน (Technician)</h3>
      <p style="font-size: 10.5px; color: #cbd5e1; line-height: 1.45;">รับมอบหมายงาน, ไปซ่อมหน้างาน, เบิกพัสดุในระบบ, ยื่นมือถือตนเองให้ผู้แจ้งเซ็นรับทราบผลงาน</p>
    </div>
    <div style="flex: 1; background: #1e293b; border-left: 4px solid #10b981; border-radius: 10px; padding: 4mm 4.5mm;">
      <h3 style="font-size: 13.5px; font-weight: 700; color: #34d399; margin-bottom: 1.5mm;">3. เจ้าของบริเวณ (Requester / Owner)</h3>
      <p style="font-size: 10.5px; color: #cbd5e1; line-height: 1.45;">ผู้แจ้งปัญหา, ตรวจดูงานที่ช่างทำเสร็จ และลงนามรับทราบผลงานผ่านมือถือของช่างที่หน้างาน</p>
    </div>
  </div>
</div>

<!-- SLIDE 2: Core Concepts -->
<div class="slide">
  <div class="slide-header">
    <div class="header-left">
      <div class="category-tag">CORE CONCEPTS</div>
      <div class="slide-title">บทบาทหน้าที่และการปฏิบัติงานร่วมกัน (Operational Alignment)</div>
    </div>
    <div class="slide-page-num">02 / 12</div>
  </div>
  <div class="content-area">
    <div class="grid-2">
      <div class="card" style="border-left: 5px solid #1d4ed8;">
        <h3 class="card-title" style="color: #1d4ed8;">1. ผู้ควบคุมงาน (Admin) เป็นผู้เปิดใบงาน</h3>
        <p style="font-size: 11px; color: #475569; line-height: 1.5; margin-bottom: 2mm;">
          แอดมินหรือผู้ควบคุมงานทำหน้าที่รับแจ้งเหตุและสร้างใบงาน FM ในระบบ พร้อมแนบรูปและระบุผู้มอบหมายงาน เพื่อให้เกิดการควบคุมงานที่เป็นศูนย์กลางและเป็นระบบ
        </p>
        <div class="badge badge-blue">ผู้ควบคุมงานเป็นผู้สร้างใบงาน • ตรวจสอบได้ชัดเจน</div>
      </div>
      <div class="card" style="border-left: 5px solid #0f172a;">
        <h3 class="card-title" style="color: #0f172a;">2. มอบหมาย & ถือว่ารับงานทันทีในภาพรวม</h3>
        <p style="font-size: 11px; color: #475569; line-height: 1.5; margin-bottom: 2mm;">
          เมื่อผู้ควบคุมงานสร้างใบงานเสร็จ จะถือว่าช่างได้รับมอบหมายงานในภาพรวมแล้ว ช่างสามารถเข้าดูรายละเอียดและกดปุ่ม 'รับดำเนินการ' เพื่อผูกชื่อตนเองและสังกัดลงในใบงานอัตโนมัติ
        </p>
        <div class="badge" style="background: #f1f5f9; color: #0f172a;">Auto-claim • ช่างรับงานสะดวกใน 1 คลิก</div>
      </div>
      <div class="card" style="border-left: 5px solid #f59e0b;">
        <h3 class="card-title" style="color: #b45309;">3. ช่างลงพื้นที่ปฏิบัติงาน & จัดการอุปกรณ์</h3>
        <p style="font-size: 11px; color: #475569; line-height: 1.5; margin-bottom: 2mm;">
          ช่างลงพื้นที่จริง ดำเนินการซ่อม หากต้องใช้อะไหล่ให้เลือกเบิกจากสต็อกคลัง หากไม่ใช้ให้กดจบงานไม่เบิกของ หรือหากของหมดให้แจ้ง 'รอจัดซื้อ/หา' ระบุชื่อของ
        </p>
        <div class="badge badge-amber">ครอบคลุมทุกกรณี: เบิกของ • ไม่เบิก • รอจัดซื้อ</div>
      </div>
      <div class="card" style="border-left: 5px solid #10b981;">
        <h3 class="card-title" style="color: #047857;">4. ยื่นมือถือหน้างานให้เจ้าของพื้นที่ลงนาม</h3>
        <p style="font-size: 11px; color: #475569; line-height: 1.5; margin-bottom: 2mm;">
          เมื่อซ่อมเสร็จ ช่างจะเปิดหน้าใบงานบนมือถือตนเอง แล้วยื่นให้เจ้าของบริเวณหรือผู้ทำการแทนเซ็นลายมือชื่อตรวจรับงานเสร็จสิ้นหน้างานทันที ก่อนส่งให้ผู้ควบคุมงานอนุมัติตัดสต็อก
        </p>
        <div class="badge badge-green">หลักฐานตรวจรับหน้างานจริง • ดิจิทัล 100%</div>
      </div>
    </div>
  </div>
</div>

<!-- SLIDE 3: End-to-End Workflow Timeline -->
<div class="slide">
  <div class="slide-header">
    <div class="header-left">
      <div class="category-tag">WORKFLOW TIMELINE</div>
      <div class="slide-title">ไทม์ไลน์ลำดับขั้นตอนการปฏิบัติงานหน้างานจริง (Workflow Timeline)</div>
    </div>
    <div class="slide-page-num">03 / 12</div>
  </div>
  <div class="content-area">
    <div class="timeline-container">
      <div class="timeline-step" style="border-top-color: #1d4ed8;">
        <div class="step-badge" style="background: #1d4ed8;">ขั้นตอนที่ 1</div>
        <h4>ผู้ควบคุมงานสร้างใบงาน</h4>
        <p>• ผู้ควบคุมงาน (Admin) เปิดใบงาน FM<br>• แนบรูปถ่ายจุดชำรุด (ไม่เกิน 3 รูป)<br>• ระบุผู้มอบหมายงาน<br>• สถานะ: <strong>รอดำเนินการ</strong></p>
      </div>
      <div class="timeline-step" style="border-top-color: #2563eb;">
        <div class="step-badge" style="background: #2563eb;">ขั้นตอนที่ 2</div>
        <h4>มอบหมาย & รับงาน</h4>
        <p>• ถือว่ารับงานแล้วในภาพรวม<br>• ช่างกด 'รับดำเนินการ'<br>• ดึงชื่อ-สังกัดช่างเข้าใบงานอัตโนมัติ</p>
      </div>
      <div class="timeline-step" style="border-top-color: #f59e0b;">
        <div class="step-badge" style="background: #f59e0b;">ขั้นตอนที่ 3</div>
        <h4>ปฏิบัติงาน & จัดการพัสดุ</h4>
        <p>• ช่างไปหน้างาน<br>• เบิกพัสดุจากคลัง หรือ<br>• กด 'จบงาน (ไม่เบิกของ)' หรือ<br>• กด 'รอจัดซื้อ/หา (ชื่อของ)'</p>
      </div>
      <div class="timeline-step" style="border-top-color: #10b981;">
        <div class="step-badge" style="background: #10b981;">ขั้นตอนที่ 4</div>
        <h4>ผู้แจ้งลงนามบนมือถือช่าง</h4>
        <p>• ช่างทำงานเสร็จที่หน้างาน<br>• ยื่นมือถือให้เจ้าของบริเวณเซ็น<br>• ผู้แจ้งวาดลายเซ็น + ใส่รหัสพนักงาน<br>• ยืดหยุ่น: เซ็นก่อน/หลังได้</p>
      </div>
      <div class="timeline-step" style="border-top-color: #059669;">
        <div class="step-badge" style="background: #059669;">ขั้นตอนที่ 5</div>
        <h4>ผู้ควบคุมงานอนุมัติปิดงาน</h4>
        <p>• ผู้ควบคุมงานตรวจรายการเบิก<br>• กดยืนยัน: <strong>ตัดสต็อกคลังทันที</strong><br>• ปิดสถานะ: <strong>เสร็จสิ้น</strong> พร้อมลงวันที่</p>
      </div>
      <div class="timeline-step" style="border-top-color: #0f172a;">
        <div class="step-badge" style="background: #0f172a;">ขั้นตอนที่ 6</div>
        <h4>พิมพ์ & สรุปรายงาน</h4>
        <p>• พิมพ์แบบฟอร์ม SFM-xxxx<br>• Export รายงาน PDF/Excel<br>• แสดงวันที่เสร็จสิ้นในวงเล็บ<br>• ย่อสถานะ 'รอจัดซื้อ/หา'</p>
      </div>
    </div>
  </div>
</div>

<!-- SLIDE 4: Step 1 & 2 -->
<div class="slide">
  <div class="slide-header">
    <div class="header-left">
      <div class="category-tag">STEP 1 & 2: CREATION & ASSIGNMENT</div>
      <div class="slide-title">ขั้นตอนที่ 1 & 2: ผู้ควบคุมงานสร้างใบงาน และการรับมอบหมายงาน</div>
    </div>
    <div class="slide-page-num">04 / 12</div>
  </div>
  <div class="content-area">
    <div class="grid-2">
      <div class="card">
        <h3 class="card-title" style="color: #1d4ed8;">1. ผู้ควบคุมงาน (Admin) เป็นผู้สร้างใบงาน</h3>
        <p style="font-size: 11px; color: #475569; line-height: 1.45; margin-bottom: 2mm;">
          เพื่อความเป็นระเบียบและควบคุมงบประมาณ ผู้ควบคุมงานทำหน้าที่เป็นผู้เปิดใบงานในระบบ:
        </p>
        <ul class="check-list">
          <li>เข้าเมนู FM กด <strong>'+ สร้างใบงาน FM ใหม่'</strong></li>
          <li>กรอกข้อมูลสถานที่ แผนก ผู้แจ้ง เรื่อง และรายละเอียดอาการชำรุด</li>
          <li>ระบุชื่อ <strong>'ผู้มอบหมายงาน'</strong> (Admin/Supervisor ผู้ควบคุม)</li>
          <li><strong>แนบรูปถ่ายสภาพหน้างาน (สูงสุด 3 รูป):</strong> มีระบบบีบอัดภาพอัตโนมัติ ช่วยให้ช่างเห็นหน้างานล่วงหน้าและเตรียมอุปกรณ์ได้ตรงจุด</li>
          <li>รองรับการสแกน OCR จากเอกสารกระดาษเดิมได้ทันที</li>
        </ul>
      </div>

      <div class="card">
        <h3 class="card-title" style="color: #0f172a;">2. การมอบหมาย & รับงานในภาพรวม</h3>
        <p style="font-size: 11px; color: #475569; line-height: 1.45; margin-bottom: 2mm;">
          กลไกการรับงานที่สอดคล้องกับการทำงานจริงของทีมช่าง:
        </p>
        <ul class="check-list">
          <li><strong>ถือว่ารับงานไปแล้วในภาพรวม:</strong> ทันทีที่ผู้ควบคุมงานสร้างใบงานเสร็จ งานจะเข้าสู่คิวงานของทีมซ่อมบำรุงทันที</li>
          <li>ช่างเปิดดูรายการงานในแท็บ <strong>'รอดำเนินการ'</strong> หรือกดปุ่ม <strong>'งานของฉัน'</strong></li>
          <li>ช่างผู้เข้าปฏิบัติงานกดปุ่ม <strong>'รับดำเนินการใบงานนี้'</strong></li>
          <li>ระบบจะดึงชื่อ-นามสกุล และสังกัดของช่างจากบัญชีที่ Login มาบันทึกลงใบงานอัตโนมัติ (ไม่ต้องพิมพ์เอง)</li>
          <li>ใบงานเดิมที่ยังไม่มีช่าง จะแสดงเครื่องหมายขีด (-) สะอาดตา รอช่างเข้ามารับงานตามจริง</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<!-- SLIDE 5: Step 3 - Technician Field Work -->
<div class="slide">
  <div class="slide-header">
    <div class="header-left">
      <div class="category-tag">STEP 3: FIELD EXECUTION</div>
      <div class="slide-title">ขั้นตอนที่ 3: ช่างลงพื้นที่ปฏิบัติงาน & การจัดการพัสดุอุปกรณ์</div>
    </div>
    <div class="slide-page-num">05 / 12</div>
  </div>
  <div class="content-area">
    <div class="grid-3">
      <div class="card" style="border-top: 4px solid #1d4ed8;">
        <h3 class="card-title" style="color: #1d4ed8; font-size: 13.5px;">3ก. เบิกพัสดุจากคลัง</h3>
        <p style="font-size: 10.5px; color: #475569; line-height: 1.45;">
          • ช่างตรวจสอบพบว่าต้องใช้อะไหล่<br>
          • ดูตารางสต็อกอุปกรณ์คงเหลือ Real-time ในหน้าใบงาน<br>
          • กดปุ่ม '+' เพื่อเพิ่มอุปกรณ์ ระบุจำนวนที่ต้องใช้จริง<br>
          • กดปุ่ม <strong>'ส่งรายการอุปกรณ์รอตรวจสอบ'</strong><br>
          • ใบงานจะเปลี่ยนสถานะเป็น 'รอตรวจสอบ' เพื่อรอแอดมินอนุมัติตัดสต็อก
        </p>
      </div>

      <div class="card" style="border-top: 4px solid #10b981;">
        <h3 class="card-title" style="color: #047857; font-size: 13.5px;">3ข. จบงานไม่เบิกของ</h3>
        <p style="font-size: 10.5px; color: #475569; line-height: 1.45;">
          • สำหรับงานบริการ ตรวจเช็ค ทำความสะอาด ขันน็อต ปรับตั้งค่า<br>
          • ไม่มีการเบิกพัสดุหรือใช้วัสดุสิ้นเปลืองใดๆ<br>
          • ไม่ต้องเลือกอุปกรณ์ในรายการ<br>
          • กดปุ่ม <strong>'ดำเนินการแล้ว (ไม่เบิกของ)'</strong><br>
          • ใบงานส่งไปรอผู้ควบคุมงานอนุมัติปิดงานได้ทันที รวดเร็ว ไม่สร้างภาระคลัง
        </p>
      </div>

      <div class="card" style="border-top: 4px solid #f59e0b;">
        <h3 class="card-title" style="color: #b45309; font-size: 13.5px;">3ค. อะไหล่หมด / รอจัดซื้อ</h3>
        <p style="font-size: 10.5px; color: #475569; line-height: 1.45;">
          • ตรวจหน้างานแล้วพบว่าไม่มีอะไหล่ในสต็อกคลัง<br>
          • กดปุ่มสีส้ม <strong>'รอของ (จัดซื้อ/หาอุปกรณ์)'</strong><br>
          • พิมพ์ระบุของที่ต้องสั่ง เช่น 'ลูกลอยชักโครก 1/2 นิ้ว'<br>
          • สถานะย่อเป็น: <strong>รอจัดซื้อ/หา (ลูกลอยชักโครก 1/2 นิ้ว)</strong><br>
          • เมื่อของมาส่ง กด 'เปลี่ยนกลับเป็นรอดำเนินการ' เข้าทำต่อ
        </p>
      </div>
    </div>
  </div>
</div>

<!-- SLIDE 6: Step 4 - On-Site Signature -->
<div class="slide">
  <div class="slide-header">
    <div class="header-left">
      <div class="category-tag">STEP 4: ON-SITE SIGNATURE</div>
      <div class="slide-title">ขั้นตอนที่ 4: การลงนามตรวจรับหน้างาน (ยื่นมือถือให้ผู้แจ้งเซ็น)</div>
    </div>
    <div class="slide-page-num">06 / 12</div>
  </div>
  <div class="content-area">
    <div class="grid-2">
      <div class="card" style="border-left: 5px solid #10b981;">
        <h3 class="card-title" style="color: #047857;">ขั้นตอนการลงนามรับทราบผลงานที่หน้างานจริง</h3>
        <ul class="check-list">
          <li><strong>ช่างปฏิบัติงานให้แล้วเสร็จที่หน้างาน:</strong> ตรวจสอบความเรียบร้อยของอุปกรณ์และการทำงาน</li>
          <li><strong>ช่างเปิดหน้าใบงานบนมือถือตนเอง:</strong> เปิดหน้าเว็บ Stoxy เมนูใบงาน FM แล้วกดปุ่ม <strong>'✍️ ลงนามรับทราบ'</strong></li>
          <li><strong>ยื่นมือถือให้เจ้าของบริเวณ (ผู้แจ้งงาน):</strong> ส่งมือถือให้ผู้แจ้งงาน หรือผู้ทำการแทน ตรวจดูผลงาน</li>
          <li><strong>ผู้แจ้งลงลายมือชื่อบนหน้าจอช่าง:</strong> ใช้นิ้วมือวาดลายเซ็น ระบุชื่อ-นามสกุล และรหัสพนักงาน (ถ้ามี) แล้วกดบันทึก</li>
          <li><strong>ความยืดหยุ่นของระบบ:</strong> สามารถลงนามไว้ก่อนตั้งแต่สถานะ 'รอดำเนินการ' ได้ (เช่น กรณีผู้แจ้งจะไม่อยู่ช่วงบ่าย) หรือลงนามทันทีเมื่อซ่อมเสร็จ</li>
        </ul>
      </div>

      <div class="scenario-box green">
        <div class="scenario-title">📌 ตัวอย่างสถานการณ์จริง: การลงนามหน้างาน</div>
        <div class="scenario-text">
          <strong>ใบงาน:</strong> FM-6090 แอร์น้ำหยด แผนกบัญชี ชั้น 3<br>
          <strong>ช่างผู้ปฏิบัติงาน:</strong> ช่างสมชาย<br>
          <strong>เจ้าของบริเวณ/ผู้แจ้ง:</strong> คุณกนกวรรณ<br><br>
          <strong>ขั้นตอนที่ปฏิบัติจริง:</strong><br>
          1. ช่างสมชายซ่อมท่อน้ำทิ้งแอร์และเป่าฝุ่นจนแอร์ทำงานปกติ น้ำหยุดหยดเรียบร้อย<br>
          2. ช่างสมชายหยิบมือถือตนเอง เปิดใบงาน FM-6090 กดปุ่ม <strong>'✍️ ลงนามรับทราบ'</strong><br>
          3. ยื่นมือถือให้คุณกนกวรรณตรวจลมเย็นและความเรียบร้อยที่โต๊ะทำงาน<br>
          4. คุณกนกวรรณเซ็นชื่อด้วยนิ้วมือบนจอมือถือของช่าง พิมพ์ชื่อ <em>'กนกวรรณ มีสุข'</em> และรหัส <em>'EMP-084'</em><br>
          5. กดบันทึก ลายเซ็นดิจิทัลพร้อม Timestamp จะถูกบันทึกเข้าสู่ระบบทันที
        </div>
      </div>
    </div>
  </div>
</div>

<!-- SLIDE 7: Step 5 - Admin Review & Stock Deduction -->
<div class="slide">
  <div class="slide-header">
    <div class="header-left">
      <div class="category-tag">STEP 5: REVIEW & STOCK APPROVAL</div>
      <div class="slide-title">ขั้นตอนที่ 5: ผู้ควบคุมงานตรวจสอบ & อนุมัติตัดสต็อกปิดงาน</div>
    </div>
    <div class="slide-page-num">07 / 12</div>
  </div>
  <div class="content-area">
    <div class="grid-2">
      <div class="card" style="border-top: 4px solid #1d4ed8;">
        <h3 class="card-title" style="color: #1d4ed8;">1. ผู้ควบคุมงาน (คนเดียวกับข้อ 1) ตรวจสอบงาน</h3>
        <p style="font-size: 11px; color: #475569; line-height: 1.45; margin-bottom: 2mm;">
          เมื่อช่างส่งรายการอุปกรณ์และผู้แจ้งลงนามแล้ว ผู้ควบคุมงานจะเห็นงานขึ้นในแท็บ 'รอตรวจสอบ' และมีแถบแจ้งเตือนสีส้มด้านบน<br><br>
          <strong>การปรับแต่งรายการก่อนอนุมัติ:</strong><br>
          ผู้ควบคุมงานสามารถตรวจสอบความเหมาะสมของอุปกรณ์ที่ช่างขอเบิก หากจำนวนไม่ตรงหรือหยิบผิดรุ่น สามารถ <strong>แก้ไขจำนวน เพิ่มรายการ หรือลบรายการอุปกรณ์</strong> ออกได้ก่อนกดอนุมัติ
        </p>
        <div class="badge badge-blue">ผู้ควบคุมงานมีสิทธิ์ตรวจแก้รายการได้ 100%</div>
      </div>

      <div class="card" style="border-top: 4px solid #10b981;">
        <h3 class="card-title" style="color: #047857;">2. อนุมัติตัดสต็อกอัตโนมัติ (1-Click Approval)</h3>
        <p style="font-size: 11px; color: #475569; line-height: 1.45; margin-bottom: 2mm;">
          เมื่อตรวจสอบความถูกต้องแล้ว ให้กดปุ่ม <strong>'อนุมัติและตัดสต็อก'</strong> (หรืออนุมัติปิดงานไม่เบิกของ)<br><br>
          <strong>ผลลัพธ์อัตโนมัติในระบบ:</strong><br>
          • ตัดลดยอดพัสดุในคลังสต็อกทันที<br>
          • บันทึกประวัติ Stock Movement ประเภท Requisition<br>
          • เปลี่ยนสถานะใบงานเป็น <strong>'เสร็จสิ้น'</strong><br>
          • บันทึกชื่อผู้ควบคุมงานผู้อนุมัติ และ Timestamp วันที่เสร็จสิ้นอัตโนมัติ
        </p>
        <div class="badge badge-green">1-Click Approval • สต็อกตรงแม่นยำ ไม่ต้องคีย์ซ้ำ</div>
      </div>
    </div>
  </div>
</div>

<!-- SLIDE 8: Admin Privileges -->
<div class="slide">
  <div class="slide-header">
    <div class="header-left">
      <div class="category-tag">ADMIN SUPER POWERS</div>
      <div class="slide-title">สิทธิ์พิเศษของผู้ดูแลระบบ (Admin Edit & Status Override)</div>
    </div>
    <div class="slide-page-num">08 / 12</div>
  </div>
  <div class="content-area">
    <div class="grid-2">
      <div class="card">
        <h3 class="card-title" style="color: #1d4ed8;">✏️ ปุ่ม 'แก้ไขใบงาน' (Admin Edit Details)</h3>
        <p style="font-size: 11px; color: #475569; line-height: 1.45; margin-bottom: 2mm;">
          สำหรับแก้ไขข้อผิดพลาดของข้อมูลใบงานที่สร้างไว้แล้ว:
        </p>
        <ul class="check-list">
          <li>แก้ไขเลขที่ใบงาน, ประเภทงาน, วันที่แจ้ง, วันที่ต้องการใช้งาน</li>
          <li>แก้ไขเรื่อง/หัวข้องาน, สถานที่, รายละเอียดงาน</li>
          <li>แก้ไขชื่อผู้แจ้ง, แผนก/ฝ่าย, เบอร์โทรศัพท์, อีเมล</li>
          <li>แก้ไขชื่อช่างผู้ดำเนินการ และสังกัดช่าง (หรือเว้นว่างเพื่อล้างค่า)</li>
          <li><strong>จัดการรูปภาพประกอบ:</strong> ลบรูปเก่าออก หรืออัปโหลดรูปใหม่เพิ่มเติม (รวมสูงสุดไม่เกิน 3 รูป พร้อมบีบอัดภาพอัตโนมัติ)</li>
        </ul>
      </div>

      <div class="card">
        <h3 class="card-title" style="color: #b45309;">⚙️ ปุ่ม 'แก้ไขสถานะ' (Admin Status Override)</h3>
        <p style="font-size: 11px; color: #475569; line-height: 1.45; margin-bottom: 2mm;">
          สิทธิ์เด็ดขาดสำหรับแอดมินในการปรับเปลี่ยนสถานะใบงาน:
        </p>
        <ul class="check-list">
          <li>ผู้ดูแลระบบมีสิทธิ์แก้ไขสถานะใบงานได้ <strong>ทุกสถานะ</strong></li>
          <li><strong>รวมถึงใบงานที่ 'เสร็จสิ้นแล้ว' หรือ 'ยกเลิกแล้ว'</strong> ก็สามารถแก้ไขกลับมาเปิดใหม่ได้</li>
          <li>เลือกปรับเป็น: รอดำเนินการ, รอจัดซื้อ/หา, รอตรวจสอบ, เสร็จสิ้น, ส่งกลับแก้ไข หรือ ยกเลิก</li>
          <li>มีช่องระบุ <strong>'หมายเหตุการเปลี่ยนสถานะ'</strong> เพื่อบันทึกประวัติการแก้ไข</li>
          <li>แจ้งเตือนการเปลี่ยนแปลงสถานะผ่าน LINE Notify อัตโนมัติ</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<!-- SLIDE 9: Search, Filter, Sort -->
<div class="slide">
  <div class="slide-header">
    <div class="header-left">
      <div class="category-tag">NAVIGATION & PRODUCTIVITY</div>
      <div class="slide-title">ฟีเจอร์การค้นหา ตัวกรอง และการจัดเรียง (Filter & Sort By)</div>
    </div>
    <div class="slide-page-num">09 / 12</div>
  </div>
  <div class="content-area">
    <div class="grid-3">
      <div class="card" style="border-top: 4px solid #1d4ed8;">
        <h3 class="card-title" style="color: #1d4ed8; font-size: 13.5px;">1. การจัดเรียง (Sort By)</h3>
        <p style="font-size: 10.5px; color: #475569; line-height: 1.45;">
          • <strong>ค่าเริ่มต้น (Default):</strong> เรียงตาม <strong>เลขที่ใบงาน (มาก → น้อย)</strong><br>
          • ใช้ Natural Numeric Sort ทำให้เรียงเลขเช่น 6095, 6090 ถูกต้อง ไม่เพี้ยน<br>
          • ตัวเลือกเสริม: เลขที่ใบงาน (น้อย → มาก), วันที่แจ้ง (ใหม่/เก่า), วันที่ต้องการใช้ (เร็วสุด), วันที่สร้าง
        </p>
      </div>

      <div class="card" style="border-top: 4px solid #0f172a;">
        <h3 class="card-title" style="color: #0f172a; font-size: 13.5px;">2. ช่องค้นหา (Search Box)</h3>
        <p style="font-size: 10.5px; color: #475569; line-height: 1.45;">
          • ค้นหาแบบ Real-time คลุมทุกฟิลด์สำคัญ<br>
          • ค้นหาด้วย: เลขที่ใบงาน (เช่น 6090), ชื่องาน, สถานที่ดำเนินการ<br>
          • ค้นหาตาม: ชื่อผู้แจ้ง, แผนกผู้แจ้ง, ชื่อช่าง, หน่วยงานช่าง, ประเภทงาน<br>
          • มีปุ่ม (X) ในช่องเพื่อเคลียร์คำค้นหาอย่างรวดเร็ว
        </p>
      </div>

      <div class="card" style="border-top: 4px solid #10b981;">
        <h3 class="card-title" style="color: #047857; font-size: 13.5px;">3. ตัวกรอง & ปุ่มลัด (Filters)</h3>
        <p style="font-size: 10.5px; color: #475569; line-height: 1.45;">
          • <strong>ตัวกรองประเภทงาน:</strong> กรองดูเฉพาะ ระบบไฟฟ้า, ระบบประปา, แอร์, อาคาร ฯลฯ<br>
          • <strong>ปุ่มลัด 'งานของฉัน':</strong> กรองดูเฉพาะงานที่ตนเองรับผิดชอบใน 1 คลิก<br>
          • <strong>แท็บสถานะ:</strong> แสดง Badge นับจำนวนงานทุกสถานะ<br>
          • <strong>ปุ่ม 'ล้างตัวกรอง':</strong> รีเซ็ตทุกอย่างกลับสู่ค่าเริ่มต้น
        </p>
      </div>
    </div>
  </div>
</div>

<!-- SLIDE 10: Print & Reports -->
<div class="slide">
  <div class="slide-header">
    <div class="header-left">
      <div class="category-tag">REPORTING & PRINTING</div>
      <div class="slide-title">การพิมพ์เอกสารใบงาน & การออกรายงานสรุป (SFM & Reports)</div>
    </div>
    <div class="slide-page-num">10 / 12</div>
  </div>
  <div class="content-area">
    <div class="grid-2">
      <div class="card">
        <h3 class="card-title" style="color: #1d4ed8;">🖨️ การพิมพ์เอกสารใบงานเดี่ยว (Print SFM-xxxx)</h3>
        <ul class="check-list">
          <li><strong>พิมพ์เฉพาะเอกสาร:</strong> ปุ่ม 'พิมพ์' ในหน้ารายละเอียดใบงานจะตัดเมนูและกรอบหน้าต่างที่ไม่เกี่ยวข้องออกทั้งหมด เหลือเฉพาะตัวแบบฟอร์ม อบก-จ.-01</li>
          <li><strong>ตั้งชื่อไฟล์ PDF อัตโนมัติ:</strong> กำหนดชื่อไฟล์เป็น <strong>SFM-[เลขที่ใบงาน]</strong> เช่น <em>SFM-6090</em> โดยตรงเมื่อกด Save as PDF</li>
          <li><strong>แสดงผลสะอาดตา:</strong> ช่องช่างผู้ดำเนินการที่ยังไม่มีผู้รับงาน จะแสดงเครื่องหมายขีด (-) โดยไม่มีวงเล็บค้าง</li>
        </ul>
      </div>

      <div class="card">
        <h3 class="card-title" style="color: #047857;">📊 รายงานสรุปใบแจ้งซ่อม (PDF & Excel Export)</h3>
        <ul class="check-list">
          <li>เข้าเมนู <strong>'รายงาน'</strong> เลือก <strong>'รายงานสรุปใบงานและอุปกรณ์ที่ใช้ (FM)'</strong></li>
          <li>เลือกช่วงเวลา: ดูทั้งหมด หรือเลือกเฉพาะรอบเดือนที่ต้องการได้</li>
          <li><strong>การปรับปรุงสถานะใหม่ตามคำขอ:</strong>
            <p style="font-size: 11px; color: #15803d; font-weight: 700; margin-top: 1mm;">
              • ถ้าเสร็จสิ้นแล้ว → แสดง <code>เสร็จสิ้น (วันที่)</code> เช่น <em>เสร็จสิ้น (24/11/2569)</em><br>
              • ถ้ารอจัดซื้อ → ย่อเป็น <code>รอจัดซื้อ/หา (ข้อความที่กรอก)</code> เช่น <em>รอจัดซื้อ/หา (หลอดไฟ LED)</em>
            </p>
          </li>
          <li>รองรับทั้งไฟล์ <strong>PDF (แนวนอน สวยงาม)</strong> และ <strong>Excel (มี 2 Sheet: สรุปใบงาน และ รายการอุปกรณ์ที่ใช้)</strong></li>
        </ul>
      </div>
    </div>
  </div>
</div>

<!-- SLIDE 11: Permissions Matrix -->
<div class="slide">
  <div class="slide-header">
    <div class="header-left">
      <div class="category-tag">ROLES & RESPONSIBILITIES</div>
      <div class="slide-title">ตารางสรุปหน้าที่และความรับผิดชอบ (Role & Responsibility Matrix)</div>
    </div>
    <div class="slide-page-num">11 / 12</div>
  </div>
  <div class="content-area">
    <table class="matrix-table">
      <thead>
        <tr>
          <th style="width: 42%;">ขั้นตอน / การดำเนินการ</th>
          <th style="width: 20%; text-align: center;">ผู้ควบคุมงาน (Admin)</th>
          <th style="width: 19%; text-align: center;">ช่างผู้ปฏิบัติงาน (Tech)</th>
          <th style="width: 19%; text-align: center;">เจ้าของบริเวณ (Requester)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1. สร้างใบแจ้งงาน FM ในระบบ / แนบรูปถ่ายหน้างาน</strong></td>
          <td class="center text-yes">✔️ ผู้สร้างหลัก</td>
          <td class="center text-no">—</td>
          <td class="center" style="font-size: 10px; color: #475569;">แจ้งเรื่องให้ผู้ควบคุม</td>
        </tr>
        <tr>
          <td><strong>2. มอบหมายงาน / รับงานในภาพรวม</strong></td>
          <td class="center text-yes">✔️ ผู้มอบหมาย</td>
          <td class="center text-yes">✔️ รับงานหน้างาน</td>
          <td class="center text-no">—</td>
        </tr>
        <tr>
          <td><strong>3. ปฏิบัติงาน / เบิกพัสดุ / แจ้งรอจัดซื้อ</strong></td>
          <td class="center text-no">—</td>
          <td class="center text-yes">✔️ ปฏิบัติงานจริง</td>
          <td class="center text-no">—</td>
        </tr>
        <tr>
          <td><strong>4. การลงนามรับทราบผลการดำเนินงาน</strong></td>
          <td class="center text-no">—</td>
          <td class="center text-yes">✔️ ยื่นมือถือให้เซ็น</td>
          <td class="center text-yes">✔️ ลงนามบนมือถือช่าง</td>
        </tr>
        <tr>
          <td><strong>5. ตรวจสอบรายการอุปกรณ์ & อนุมัติตัดสต็อก</strong></td>
          <td class="center text-yes">✔️ ตรวจ & ตัดสต็อก</td>
          <td class="center text-no">—</td>
          <td class="center text-no">—</td>
        </tr>
        <tr>
          <td><strong>6. สิทธิ์แก้ไขใบงาน & ปรับสถานะทุกสถานะ</strong></td>
          <td class="center text-yes">✔️ สิทธิ์เฉพาะ Admin</td>
          <td class="center text-no">—</td>
          <td class="center text-no">—</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- SLIDE 12: Summary Slide -->
<div class="slide dark" style="justify-content: center;">
  <div class="slide-header">
    <div class="header-left">
      <div class="category-tag">SUMMARY & BEST PRACTICES</div>
      <div class="slide-title">สรุปประโยชน์ของระบบ FM และแนวปฏิบัติที่ดี</div>
    </div>
    <div class="slide-page-num">12 / 12</div>
  </div>

  <div class="content-area">
    <div class="grid-4">
      <div class="card dark" style="border-top: 4px solid #1d4ed8;">
        <h4 style="font-size: 13.5px; font-weight: 700; color: #60a5fa; margin-bottom: 2.5mm;">ควบคุมงานเป็นระบบ</h4>
        <p style="font-size: 10.5px; color: #cbd5e1; line-height: 1.45;">
          ผู้ควบคุมงานเป็นจุดศูนย์กลางในการเปิดงานและตรวจรับตัดสต็อก ทำให้งานไม่ตกหล่นและมีผู้รับผิดชอบชัดเจน
        </p>
      </div>

      <div class="card dark" style="border-top: 4px solid #10b981;">
        <h4 style="font-size: 13.5px; font-weight: 700; color: #34d399; margin-bottom: 2.5mm;">ตรวจรับหน้างานจริง</h4>
        <p style="font-size: 10.5px; color: #cbd5e1; line-height: 1.45;">
          ช่างนำมือถือไปให้เจ้าของพื้นที่ตรวจงานและเซ็นรับทราบทันที มีหลักฐานเป็นลายเซ็นดิจิทัลพร้อม Timestamp
        </p>
      </div>

      <div class="card dark" style="border-top: 4px solid #f59e0b;">
        <h4 style="font-size: 13.5px; font-weight: 700; color: #fbbf24; margin-bottom: 2.5mm;">สต็อกตรง 100%</h4>
        <p style="font-size: 10.5px; color: #cbd5e1; line-height: 1.45;">
          พัสดุและอะไหล่ทุกชิ้นถูกผูกกับเลขที่ใบงาน FM และอนุมัติตัดสต็อกอัตโนมัติ ไม่ต้องคีย์เอกสารซ้ำ
        </p>
      </div>

      <div class="card dark" style="border-top: 4px solid #a855f7;">
        <h4 style="font-size: 13.5px; font-weight: 700; color: #c084fc; margin-bottom: 2.5mm;">รายงานครบถ้วน</h4>
        <p style="font-size: 10.5px; color: #cbd5e1; line-height: 1.45;">
          ผู้บริหารสามารถตรวจสอบประวัติการซ่อมบำรุงและต้นทุนพัสดุที่ใช้ย้อนหลังได้ตลอดเวลาผ่าน PDF/Excel
        </p>
      </div>
    </div>
  </div>

  <div style="margin-top: 4mm; text-align: center; color: #94a3b8; font-size: 11px;">
    ระบบบริหารจัดการพัสดุและงานซ่อมบำรุง Stoxy (Facility Management) • คู่มือการใช้งานเวอร์ชัน 2.0
  </div>
</div>

</body>
</html>
"""

html_path = r"d:\Application\Stoxy\docs\FM_Presentation.html"
with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML saved to: {html_path}")

# Run Edge headless to print to PDF
edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
pdf_path = r"d:\Application\Stoxy\docs\FM_User_Manual_Presentation.pdf"
pub_pdf_path = r"d:\Application\Stoxy\public\docs\FM_User_Manual_Presentation.pdf"

cmd = [
    edge_path,
    "--headless",
    "--disable-gpu",
    "--print-to-pdf-no-header",
    f"--print-to-pdf={pdf_path}",
    html_path
]

print("Converting HTML to PDF via Edge headless...")
res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode == 0:
    print(f"PDF successfully generated at: {pdf_path}")
    import shutil
    shutil.copyfile(pdf_path, pub_pdf_path)
    print(f"Copied PDF to: {pub_pdf_path}")
else:
    print(f"Edge error: {res.stderr}")

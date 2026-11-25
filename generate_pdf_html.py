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
    padding: 14mm 18mm;
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
    margin-bottom: 5mm;
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

  /* Layout grids */
  .content-area {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6mm;
    height: 100%;
  }

  .grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 5mm;
    height: 100%;
  }

  .grid-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 5mm;
    height: 100%;
  }

  /* Cards */
  .card {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 5mm 6mm;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    display: flex;
    flex-direction: column;
  }

  .card.dark {
    background: #1e293b;
    border-color: #334155;
    color: #ffffff;
  }

  .card-title {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 2mm;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .card-subtitle {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2.5mm;
  }

  /* Timeline styling */
  .timeline-container {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 3.5mm;
    height: 100%;
    align-items: stretch;
  }

  .timeline-step {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    border-top: 5px solid #1d4ed8;
    padding: 4mm 3.5mm;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 10px rgba(0,0,0,0.03);
  }

  .step-badge {
    align-self: flex-start;
    font-size: 10px;
    font-weight: 700;
    color: #ffffff;
    padding: 2.5px 8px;
    border-radius: 6px;
    margin-bottom: 2.5mm;
  }

  .timeline-step h4 {
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 2mm;
    line-height: 1.3;
  }

  .timeline-step p {
    font-size: 9.5px;
    color: #64748b;
    line-height: 1.45;
  }

  /* Badges */
  .badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 600;
    margin-top: auto;
  }
  .badge-blue { background: #eff6ff; color: #1d4ed8; }
  .badge-green { background: #ecfdf5; color: #047857; }
  .badge-amber { background: #fffbeb; color: #b45309; }

  /* Lists */
  ul.check-list {
    list-style: none;
    margin-top: 2mm;
  }
  ul.check-list li {
    font-size: 10.5px;
    color: #1e293b;
    line-height: 1.5;
    margin-bottom: 2mm;
    position: relative;
    padding-left: 16px;
  }
  ul.check-list li::before {
    content: "•";
    color: #1d4ed8;
    font-size: 15px;
    font-weight: bold;
    position: absolute;
    left: 0;
    top: -2px;
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
    นำเข้าไฟล์ FM เดิม (ถือเป็นรับงานทันที) • ช่างปฏิบัติงานและยื่นมือถือให้ลงนาม • ผู้ควบคุมงานอนุมัติตัดสต็อก
  </p>

  <div style="display: flex; gap: 5mm; width: 252mm;">
    <div style="flex: 1; background: #1e293b; border-left: 4px solid #1d4ed8; border-radius: 10px; padding: 4mm 4.5mm;">
      <h3 style="font-size: 13.5px; font-weight: 700; color: #60a5fa; margin-bottom: 1.5mm;">1. ผู้ควบคุมงาน (Admin / Supervisor)</h3>
      <p style="font-size: 10px; color: #cbd5e1; line-height: 1.45;">นำเข้าไฟล์ FM เดิมที่รับงานแล้วเข้าสู่แอพ (ถือเป็นรับงานทันที), ตรวจสอบรายการอุปกรณ์ และอนุมัติตัดสต็อก</p>
    </div>
    <div style="flex: 1; background: #1e293b; border-left: 4px solid #f59e0b; border-radius: 10px; padding: 4mm 4.5mm;">
      <h3 style="font-size: 13.5px; font-weight: 700; color: #fbbf24; margin-bottom: 1.5mm;">2. ช่างผู้ปฏิบัติงาน (Technician)</h3>
      <p style="font-size: 10px; color: #cbd5e1; line-height: 1.45;">รับผิดชอบงานหน้างาน, จัดการพัสดุตาม 3 กรณี, ยื่นมือถือให้เจ้าของบริเวณเซ็นรับทราบผลงาน</p>
    </div>
    <div style="flex: 1; background: #1e293b; border-left: 4px solid #10b981; border-radius: 10px; padding: 4mm 4.5mm;">
      <h3 style="font-size: 13.5px; font-weight: 700; color: #34d399; margin-bottom: 1.5mm;">3. เจ้าของบริเวณ (Requester / Owner)</h3>
      <p style="font-size: 10px; color: #cbd5e1; line-height: 1.45;">ผู้แจ้งปัญหา, ตรวจดูงานที่ช่างทำเสร็จ และลงนามรับทราบผลงานผ่านมือถือของช่างที่หน้างาน</p>
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
        <h3 class="card-title" style="color: #1d4ed8;">1. สร้างใบ FM = ถือเป็นการรับงานทันที</h3>
        <p style="font-size: 11px; color: #475569; line-height: 1.5; margin-bottom: 2mm;">
          ผู้ควบคุมงานนำเข้าข้อมูลหรืออัปโหลดไฟล์ FM จากระบบเดิม ซึ่งในระบบเดิมได้รับการรับงาน/อนุมัติมาเรียบร้อยแล้ว ดังนั้นการสร้างใบงานในแอพนี้จึงถือเป็นการรับงานเข้าสู่ทีมซ่อมบำรุงในภาพรวมทันที
        </p>
        <div class="badge badge-blue">นำเข้าไฟล์ FM เดิม • ถือว่ารับงานทันที</div>
      </div>
      <div class="card" style="border-left: 5px solid #0f172a;">
        <h3 class="card-title" style="color: #0f172a;">2. ช่างรับดำเนินการ & ระบุตัวผู้รับผิดชอบ</h3>
        <p style="font-size: 11px; color: #475569; line-height: 1.5; margin-bottom: 2mm;">
          ใบงานจะขึ้นในแท็บ 'รอดำเนินการ' ช่างผู้จะลงมือซ่อมกดปุ่ม 'รับดำเนินการ' เพื่อผูกชื่อและสังกัดตนเองลงในใบงานอัตโนมัติ ทำให้ทราบชัดเจนว่าช่างท่านใดเป็นผู้ดูแลเคสนี้
        </p>
        <div class="badge" style="background: #f1f5f9; color: #0f172a;">Auto-claim • ช่างรับงานสะดวกใน 1 คลิก</div>
      </div>
      <div class="card" style="border-left: 5px solid #f59e0b;">
        <h3 class="card-title" style="color: #b45309;">3. ช่างลงพื้นที่ปฏิบัติงาน (แยก 3 กรณี)</h3>
        <p style="font-size: 11px; color: #475569; line-height: 1.5; margin-bottom: 2mm;">
          ช่างเข้าแก้ปัญหาหน้างานจริงตาม 3 รูปแบบ: กรณี A มีอะไหล่เบิกคลัง / กรณี B เสร็จโดยไม่เบิกของ (ซ่อมเสร็จ เซ็นชื่อ แล้วกดเสร็จไม่เบิก) / กรณี C รอซื้อ (ระบุเลขอ้างอิง REP จากระบบ veri)
        </p>
        <div class="badge badge-amber">ครอบคลุมทุกกรณี: เบิกของ • ไม่เบิก • รอจัดซื้อ (REP)</div>
      </div>
      <div class="card" style="border-left: 5px solid #10b981;">
        <h3 class="card-title" style="color: #047857;">4. ยื่นมือถือให้เจ้าของบริเวณลงนามหน้างาน</h3>
        <p style="font-size: 11px; color: #475569; line-height: 1.5; margin-bottom: 2mm;">
          เมื่อซ่อมเสร็จ ช่างจะเปิดหน้าใบงานบนมือถือตนเอง แล้วยื่นให้เจ้าของบริเวณหรือผู้ทำการแทนเซ็นลายมือชื่อตรวจรับงานเสร็จสิ้นหน้างาน (ระบุชื่อ + รหัสพนักงาน) ก่อนส่งอนุมัติปิดงาน
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
        <h4>สร้าง FM (รับงานทันที)</h4>
        <p>• ผู้ควบคุมงานนำเข้าไฟล์ FM เดิม<br>• ถือว่ารับงานทันทีในภาพรวม<br>• แนบรูปถ่ายจุดชำรุด (1-3 รูป)<br>• สถานะ: <strong>รอดำเนินการ</strong></p>
      </div>
      <div class="timeline-step" style="border-top-color: #2563eb;">
        <div class="step-badge" style="background: #2563eb;">ขั้นตอนที่ 2</div>
        <h4>ช่างรับดำเนินการ</h4>
        <p>• ช่างดูงานในแท็บรอดำเนินการ<br>• กดปุ่ม 'รับดำเนินการ'<br>• ดึงชื่อ-สังกัดช่างเข้าใบงานอัตโนมัติ</p>
      </div>
      <div class="timeline-step" style="border-top-color: #f59e0b;">
        <div class="step-badge" style="background: #f59e0b;">ขั้นตอนที่ 3</div>
        <h4>ปฏิบัติงาน & จัดการพัสดุ</h4>
        <p>• เบิกของ (มีรูปประกอบ) หรือ<br>• เสร็จโดยไม่เบิกของ หรือ<br>• รอซื้อ: <strong>ระบุเลข REP</strong></p>
      </div>
      <div class="timeline-step" style="border-top-color: #10b981;">
        <div class="step-badge" style="background: #10b981;">ขั้นตอนที่ 4</div>
        <h4>ผู้แจ้งลงนามบนมือถือช่าง</h4>
        <p>• ยื่นมือถือให้เจ้าของบริเวณเซ็น<br>• เซ็นชื่อดิจิทัล + รหัสพนักงาน<br>• ยืนยันการซ่อมเสร็จสิ้นหน้างาน</p>
      </div>
      <div class="timeline-step" style="border-top-color: #059669;">
        <div class="step-badge" style="background: #059669;">ขั้นตอนที่ 5</div>
        <h4>ผู้ควบคุมงานอนุมัติปิดงาน</h4>
        <p>• ผู้ควบคุมงานตรวจรายการเบิก<br>• กดยืนยัน: <strong>ตัดสต็อกคลังทันที</strong><br>• ปิดสถานะ: <strong>เสร็จสิ้น</strong> พร้อมลงวันที่</p>
      </div>
      <div class="timeline-step" style="border-top-color: #0f172a;">
        <div class="step-badge" style="background: #0f172a;">ขั้นตอนที่ 6</div>
        <h4>พิมพ์ & สรุปรายงาน</h4>
        <p>• พิมพ์แบบฟอร์ม SFM-xxxx<br>• Export รายงาน PDF/Excel<br>• แสดงวันที่เสร็จสิ้นในวงเล็บ<br>• ย่อสถานะ 'รอจัดซื้อ/หา + REP'</p>
      </div>
    </div>
  </div>
</div>

<!-- SLIDE 4: Step 1 & 2 -->
<div class="slide">
  <div class="slide-header">
    <div class="header-left">
      <div class="category-tag">STEP 1 & 2: LEGACY IMPORT & ASSIGNMENT</div>
      <div class="slide-title">ขั้นตอนที่ 1 & 2: นำเข้าไฟล์ FM เดิม (รับงานทันที) และช่างรับดำเนินการ</div>
    </div>
    <div class="slide-page-num">04 / 12</div>
  </div>
  <div class="content-area">
    <div class="grid-2">
      <div class="card">
        <h3 class="card-title" style="color: #1d4ed8;">1. สร้างใบ FM นำเข้าจากระบบเดิม (ถือเป็นรับงานทันที)</h3>
        <p style="font-size: 11px; color: #475569; line-height: 1.45; margin-bottom: 2mm;">
          ที่มาและเหตุผลในการออกแบบขั้นตอน:
        </p>
        <ul class="check-list">
          <li><strong>รับงานมาจากระบบเดิมแล้ว:</strong> ใบงาน FM ได้รับการอนุมัติและรับงานมาจากระบบเดิมเรียบร้อยแล้ว</li>
          <li>ผู้ควบคุมงานทำการอัปโหลดไฟล์ FM เดิม หรือกรอกข้อมูลเข้าสู่แอพ Stoxy</li>
          <li><strong>ถือว่ารับงานเข้าสู่ทีมทันที:</strong> ทันทีที่บันทึก ระบบจะตั้งสถานะเป็น <strong>'รอดำเนินการ'</strong> โดยไม่ต้องมีขั้นตอนรอเปิด-รออนุมัติรับงานซ้ำซ้อน</li>
          <li>ระบุชื่อ <strong>'ผู้มอบหมายงาน'</strong> (Admin/Supervisor ผู้ควบคุม)</li>
          <li><strong>แนบรูปถ่ายสภาพหน้างาน (สูงสุด 3 รูป):</strong> มีระบบบีบอัดภาพอัตโนมัติ ช่วยให้ช่างเห็นอาการและจัดเตรียมเครื่องมือได้ตรงจุด</li>
          <li>รองรับการสแกน OCR จากเอกสารกระดาษเดิมได้ทันที</li>
        </ul>
      </div>

      <div class="card">
        <h3 class="card-title" style="color: #0f172a;">2. ช่างรับดำเนินการ (ระบุตัวช่างผู้รับผิดชอบ)</h3>
        <p style="font-size: 11px; color: #475569; line-height: 1.45; margin-bottom: 2mm;">
          กลไกการรับงานที่สอดคล้องกับการทำงานจริงของทีมช่าง:
        </p>
        <ul class="check-list">
          <li>ช่างทีมซ่อมบำรุงเข้าดูงานใหม่ในแท็บ <strong>'รอดำเนินการ'</strong> หรือกดปุ่มลัด <strong>'งานของฉัน'</strong></li>
          <li>ช่างผู้จะลงมือซ่อมเปิดใบงานแล้วกดปุ่ม <strong>'รับดำเนินการใบงานนี้'</strong></li>
          <li>ระบบจะดึงชื่อ-นามสกุล และสังกัดของช่างจากบัญชีที่ Login มาบันทึกลงใบงานอัตโนมัติ (ช่างไม่ต้องพิมพ์เอง)</li>
          <li>ช่วยให้ผู้ควบคุมงานและผู้แจ้งงานทราบชัดเจนว่าช่างท่านใดเป็นผู้รับผิดชอบเคสนี้</li>
          <li>ใบงานเดิมที่ยังไม่มีช่าง จะแสดงเครื่องหมายขีด (-) สะอาดตา รอช่างเข้ามารับงานตามจริง (ไม่แสดงข้อความค้างในวงเล็บ)</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<!-- SLIDE 5: Step 3 & 4 Workflows -->
<div class="slide">
  <div class="slide-header">
    <div class="header-left">
      <div class="category-tag">STEP 3 & 4: FIELD WORKFLOWS</div>
      <div class="slide-title">ขั้นตอนที่ 3 & 4: ลำดับการทำงานแยกตาม 3 กรณีหน้างานจริง (Cases A, B, C)</div>
    </div>
    <div class="slide-page-num">05 / 12</div>
  </div>
  <div class="content-area">
    <div class="grid-3">
      <div class="card" style="border-top: 4px solid #1d4ed8;">
        <h3 class="card-title" style="color: #1d4ed8; font-size: 13.5px;">กรณี A: มีอะไหล่เบิกคลัง</h3>
        <div class="card-subtitle" style="color: #1d4ed8;">มีอะไหล่พร้อมในคลังพัสดุ</div>
        <p style="font-size: 10px; color: #334155; line-height: 1.45;">
          <strong>1.</strong> ช่างลงพื้นที่ตรวจสอบและซ่อมแซมหน้างานจนเสร็จเรียบร้อย<br><br>
          <strong>2.</strong> กดปุ่ม <em>'เลือกอุปกรณ์จากคลัง'</em> <strong>(มีรูปภาพประกอบทุกรายการชัดเจน)</strong> ระบุจำนวนที่ใช้จริง<br><br>
          <strong>3.</strong> ช่างยื่นมือถือให้เจ้าของบริเวณตรวจดูผลงาน และลงนามรับทราบ + รหัสพนักงาน<br><br>
          <strong>4.</strong> ช่างกด <strong>'ส่งรายการรอตรวจสอบ'</strong> เพื่อให้ผู้ควบคุมงานอนุมัติตัดสต็อก<br><br>
          <span style="color: #1d4ed8; font-weight: bold;">📌 เหมาะกับ:</span> งานซ่อมที่มีการเบิกใช้อะไหล่หรือวัสดุสิ้นเปลืองจากคลัง
        </p>
      </div>

      <div class="card" style="border-top: 4px solid #10b981;">
        <h3 class="card-title" style="color: #047857; font-size: 13.5px;">กรณี B: เสร็จโดยไม่เบิกของ</h3>
        <div class="card-subtitle" style="color: #047857;">งานบริการ ไม่ใช้อะไหล่</div>
        <p style="font-size: 10px; color: #334155; line-height: 1.45;">
          <strong>1.</strong> ช่างลงพื้นที่ดำเนินการแก้ไขหน้างานจริง (เช่น ปรับตั้งค่า, ล้างแอร์/ทำความสะอาด, ตรวจเช็ค, ขันน็อต)<br><br>
          <strong>2.</strong> ไม่มีการเบิกพัสดุหรือใช้วัสดุสิ้นเปลืองใดๆ ในคลัง<br><br>
          <strong>3.</strong> ช่างเปิดใบงานบนมือถือ ยื่นให้เจ้าของบริเวณตรวจผลงานและเซ็นชื่อรับทราบ + รหัสพนักงาน<br><br>
          <strong>4.</strong> เมื่อลงนามเสร็จ ช่างกดปุ่ม <strong>'ดำเนินการแล้ว (ไม่เบิกของ)'</strong><br><br>
          <span style="color: #047857; font-weight: bold;">📌 เหมาะกับ:</span> งานบริการที่ไม่ต้องตัดสต็อกพัสดุ ส่งอนุมัติปิดงานได้ทันที
        </p>
      </div>

      <div class="card" style="border-top: 4px solid #f59e0b;">
        <h3 class="card-title" style="color: #b45309; font-size: 13.5px;">กรณี C: รอซื้อ (ใส่เลข REP)</h3>
        <div class="card-subtitle" style="color: #b45309;">ไม่มีอะไหล่ในสต็อกคลัง</div>
        <p style="font-size: 10px; color: #334155; line-height: 1.45;">
          <strong>1.</strong> ช่างตรวจสอบพบว่าไม่มีอะไหล่ในสต็อกคลัง<br><br>
          <strong>2.</strong> กดปุ่มสีส้ม <strong>'รอของ (จัดซื้อ/หาอุปกรณ์)'</strong><br><br>
          <strong>3.</strong> ใส่หมายเหตุ: ระบุ <strong>'หมายเลขใบเสนอแจ้งซ่อม REP-2569-XXX ตามแบบฟอร์มใน veri'</strong> และระบุของที่ต้องหา<br><br>
          <strong>4.</strong> สถานะเปลี่ยนเป็น <em>'รอจัดซื้อ/หา: [ของ] (REP-2569-XXX)'</em> (เจ้าของบริเวณยังไม่ต้องลงนาม)<br><br>
          <strong>5.</strong> เมื่อของมาส่ง ช่างกด <em>'เปลี่ยนกลับเป็นรอดำเนินการ'</em> -> ติดตั้งเสร็จ -> ยื่นมือถือให้เซ็นชื่อ -> ส่งตรวจ
        </p>
      </div>
    </div>
  </div>
</div>

<!-- SLIDE 6: Real-world Examples -->
<div class="slide">
  <div class="slide-header">
    <div class="header-left">
      <div class="category-tag">STEP 3 & 4: REAL-WORLD EXAMPLES</div>
      <div class="slide-title">ตัวอย่างประกอบจริง: การปฏิบัติงานและลงนามในขั้นตอนที่ 3 & 4</div>
    </div>
    <div class="slide-page-num">06 / 12</div>
  </div>
  <div class="content-area">
    <div class="grid-3">
      <div class="card" style="border-top: 4px solid #1d4ed8;">
        <h3 class="card-title" style="color: #1d4ed8; font-size: 12.5px;">ตัวอย่างกรณี A: ซ่อมเสร็จ & เบิกของ</h3>
        <div class="card-subtitle" style="color: #64748b; font-size: 9px;">FM-6090: ก๊อกน้ำอ่างล้างมือรั่ว (แผนกบัญชี)</div>
        <p style="font-size: 9.8px; color: #334155; line-height: 1.45;">
          <strong>1.</strong> ช่างสมชายไปหน้างาน ตรวจพบก๊อกน้ำรั่ว ดำเนินการเปลี่ยนก๊อกน้ำใหม่จนเสร็จเรียบร้อย<br><br>
          <strong>2.</strong> เปิดใบงานบนมือถือ กด <em>'เลือกอุปกรณ์จากคลัง'</em> ดูรูปภาพก๊อกน้ำชัดเจน เลือก <em>'ก๊อกน้ำอ่าง 1/2 นิ้ว x 1 อัน'</em><br><br>
          <strong>3.</strong> ช่างกดปุ่ม <strong>'✍️ ลงนามรับทราบ'</strong> ยื่นมือถือให้คุณกนกวรรณ (ผู้แจ้ง) ตรวจดูน้ำไหลปกติ<br><br>
          <strong>4.</strong> คุณกนกวรรณเซ็นชื่อด้วยนิ้วมือบนมือถือช่าง พิมพ์ชื่อ <em>'กนกวรรณ มีสุข'</em> และรหัส <em>'EMP-084'</em><br><br>
          <strong>5.</strong> ช่างกดส่งตรวจ -> ผู้ควบคุมงานตรวจสอบและอนุมัติตัดสต็อกปิดงาน
        </p>
      </div>

      <div class="card" style="border-top: 4px solid #10b981;">
        <h3 class="card-title" style="color: #047857; font-size: 12.5px;">ตัวอย่างกรณี B: เสร็จโดยไม่เบิกของ</h3>
        <div class="card-subtitle" style="color: #64748b; font-size: 9px;">FM-6092: แอร์มีกลิ่นอับ & ล้างฟิลเตอร์ (ห้องประชุม 2)</div>
        <p style="font-size: 9.8px; color: #334155; line-height: 1.45;">
          <strong>1.</strong> ช่างสมศักดิ์ เข้าไปถอดล้างแผ่นกรองอากาศ เป่าคอยล์เย็น ฉีดสเปรย์ฆ่าเชื้อจนแอร์ทำงานปกติ ลมเย็นสดชื่น<br><br>
          <strong>2.</strong> งานนี้เป็นงานบริการ ตรวจเช็คและทำความสะอาด ไม่มีการเบิกพัสดุหรือใช้วัสดุสิ้นเปลืองใดๆ<br><br>
          <strong>3.</strong> ช่างกดปุ่ม <strong>'✍️ ลงนามรับทราบ'</strong> ยื่นมือถือให้คุณวิภา (ธุรการผู้แจ้งงาน) ตรวจดูความเรียบร้อย<br><br>
          <strong>4.</strong> คุณวิภาเซ็นชื่อบนมือถือช่าง พิมพ์ชื่อ <em>'วิภา วงศ์สวัสดิ์'</em> และรหัส <em>'EMP-102'</em> แล้วกดบันทึก<br><br>
          <strong>5.</strong> ช่างกดปุ่มสีเขียว <strong>'ดำเนินการแล้ว (ไม่เบิกของ)'</strong> -> ส่งผู้ควบคุมงานอนุมัติปิดงานเสร็จสิ้นทันที
        </p>
      </div>

      <div class="card" style="border-top: 4px solid #f59e0b;">
        <h3 class="card-title" style="color: #b45309; font-size: 12.5px;">ตัวอย่างกรณี C: รอซื้อ ระบุเลข REP</h3>
        <div class="card-subtitle" style="color: #64748b; font-size: 9px;">FM-6095: มอเตอร์ประตูม้วนไฟฟ้าเสีย (โรงอาหาร)</div>
        <p style="font-size: 9.8px; color: #334155; line-height: 1.45;">
          <strong>1.</strong> ช่างตรวจพบมอเตอร์ไหม้ คลังไม่มีสต็อก จึงเปิดแบบฟอร์มขอซื้อในระบบ veri ได้เลข <em>'REP-2569-045'</em><br><br>
          <strong>2.</strong> ช่างกดปุ่ม <strong>'รอของ (จัดซื้อ/หาอุปกรณ์)'</strong> กรอกเลข REP <em>'REP-2569-045'</em> และระบุ <em>'มอเตอร์ประตูม้วน 1 HP'</em><br><br>
          <strong>3.</strong> ระบบแสดงสถานะ <strong>'รอจัดซื้อ/หา: มอเตอร์ประตูม้วน 1 HP (REP-2569-045)'</strong> ในหน้าเว็บและรายงานสรุป<br><br>
          <strong>4.</strong> เมื่อจัดซื้อส่งของมาถึง ช่างกดเปลี่ยนเป็นรอดำเนินการ นำมอเตอร์ไปติดตั้งจนประตูทำงานปกติ<br><br>
          <strong>5.</strong> ช่างยื่นมือถือให้ผู้จัดการโรงอาหารเซ็นชื่อตรวจรับมอบงาน -> ส่งผู้ควบคุมงานอนุมัติตัดสต็อกปิดงาน
        </p>
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
          ช่วยให้ผู้ดูแลระบบสามารถปรับปรุงข้อมูลใบงานที่สร้างไปแล้วได้ทุกเมื่อ:
        </p>
        <ul class="check-list">
          <li>แก้ไขเลขที่ใบงาน, ประเภทงาน, วันที่แจ้ง, วันที่ใช้งาน</li>
          <li>แก้ไขเรื่อง/หัวข้อ, สถานที่, และรายละเอียดงาน</li>
          <li>แก้ไขชื่อผู้แจ้งงาน, แผนก, เบอร์โทร และอีเมล</li>
          <li>แก้ไขชื่อช่างผู้ดำเนินการ และหน่วยงานช่าง (หรือเว้นว่างเพื่อล้างค่า)</li>
          <li><strong>แก้ไขข้อมูลอ้างอิง:</strong> หมายเลขใบเสนอแจ้งซ่อม REP ในระบบ veri และรายละเอียดรอซื้อ</li>
          <li><strong>จัดการรูปภาพประกอบ:</strong> ลบรูปเดิมออก หรืออัปโหลดรูปใหม่เพิ่มเติม (รวมสูงสุดไม่เกิน 3 รูป พร้อมระบบบีบอัดภาพอัตโนมัติ)</li>
          <li>บันทึกประวัติการแก้ไขและส่งแจ้งเตือนผ่าน LINE อัตโนมัติ</li>
        </ul>
      </div>

      <div class="card">
        <h3 class="card-title" style="color: #b45309;">⚙️ ปุ่ม 'แก้ไขสถานะ' (Admin Status Override)</h3>
        <p style="font-size: 11px; color: #475569; line-height: 1.45; margin-bottom: 2mm;">
          ฟังก์ชันสำหรับจัดการกรณีพิเศษหรือการแก้ไขข้อผิดพลาด:
        </p>
        <ul class="check-list">
          <li>ผู้ดูแลระบบมีสิทธิ์ในการปรับเปลี่ยนสถานะใบงานได้ <strong>'ทุกสถานะ'</strong></li>
          <li>ครอบคลุมถึงใบงานที่ <strong>'เสร็จสิ้นแล้ว'</strong> หรือ <strong>'ยกเลิกแล้ว'</strong> ก็สามารถแก้ไขได้</li>
          <li>ปรับเปลี่ยนเป็น: รอดำเนินการ, รอจัดซื้อ/หา, รอตรวจสอบ, เสร็จสิ้น, ส่งกลับแก้ไข หรือ ยกเลิก</li>
          <li>มีช่องให้ระบุ <strong>'หมายเหตุการเปลี่ยนสถานะ'</strong> เพื่อเก็บบันทึกประวัติ</li>
          <li>หากปรับเป็น 'เสร็จสิ้น' ระบบจะบันทึกชื่อแอดมินและเวลาเสร็จสิ้นให้อัตโนมัติ</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<!-- SLIDE 9: Filter & Sort By -->
<div class="slide">
  <div class="slide-header">
    <div class="header-left">
      <div class="category-tag">SEARCH & NAVIGATION</div>
      <div class="slide-title">ฟีเจอร์การค้นหา ตัวกรอง และการเรียงลำดับ (Filter & Sort By)</div>
    </div>
    <div class="slide-page-num">09 / 12</div>
  </div>
  <div class="content-area">
    <div class="grid-3">
      <div class="card" style="border-top: 4px solid #1d4ed8;">
        <h3 class="card-title" style="color: #1d4ed8; font-size: 13.5px;">Sort By: เรียงลำดับตาม</h3>
        <div class="card-subtitle" style="color: #1d4ed8;">Default: เลขที่ใบงาน มาก → น้อย</div>
        <p style="font-size: 10.5px; color: #475569; line-height: 1.45;">
          • ค่าเริ่มต้นระบบจัดเรียงตาม <strong>'เลขที่ใบงาน (มาก → น้อย)'</strong> ทันทีที่เปิดหน้า<br>
          • ใช้ระบบ Natural Sort ถูกต้องทั้งเลขล้วน (เช่น 6095, 6090) และแบบมีอักษรนำ (FM-6095)<br>
          • สามารถเลือกเรียงตาม: วันที่แจ้ง (ใหม่/เก่า), วันที่ต้องการใช้ หรือ วันที่สร้างได้
        </p>
      </div>

      <div class="card" style="border-top: 4px solid #0f172a;">
        <h3 class="card-title" style="color: #0f172a; font-size: 13.5px;">Search Box: ช่องค้นหาอัจฉริยะ</h3>
        <div class="card-subtitle" style="color: #0f172a;">Real-time Multi-field Search</div>
        <p style="font-size: 10.5px; color: #475569; line-height: 1.45;">
          • ค้นหาได้ทั้ง เลขที่ใบงาน (เช่น 6090), ชื่องาน, สถานที่ดำเนินการ<br>
          • ค้นหาตาม ชื่อผู้แจ้ง, แผนก/ฝ่ายของผู้แจ้ง<br>
          • ค้นหาตาม ชื่อช่างผู้ดำเนินการ, สังกัดช่าง, ประเภทงาน และหมายเหตุ<br>
          • มีปุ่ม (X) ในช่องเพื่อล้างคำค้นหาได้อย่างสะดวกรวดเร็ว
        </p>
      </div>

      <div class="card" style="border-top: 4px solid #10b981;">
        <h3 class="card-title" style="color: #047857; font-size: 13.5px;">หน้ารายการอุปกรณ์พร้อมรูปภาพ</h3>
        <div class="card-subtitle" style="color: #047857;">Visual Inventory Picker</div>
        <p style="font-size: 10.5px; color: #475569; line-height: 1.45;">
          • หน้า 'เลือกอุปกรณ์จากคลัง' <strong>แสดงรูปภาพประกอบทุกรายการชัดเจน</strong><br>
          • ช่วยให้ช่างเห็นรูปทรง สี และหน้าตาอะไหล่ก่อนกดเลือก ป้องกันการเบิกผิดรุ่น<br>
          • แสดงยอดคงเหลือในคลัง Real-time และตำแหน่งที่เก็บอุปกรณ์<br>
          • ปุ่มลัด <strong>'งานของฉัน'</strong>: กดเพื่อกรองดูเฉพาะงานที่ตนเองรับผิดชอบได้ทันทีในคลิกเดียว
        </p>
      </div>
    </div>
  </div>
</div>

<!-- SLIDE 10: SFM Print & Reports -->
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
        <h3 class="card-title" style="color: #1d4ed8;">🖨️ การพิมพ์ใบงาน SFM (Print Single Work Order)</h3>
        <p style="font-size: 11px; color: #475569; line-height: 1.45; margin-bottom: 2mm;">
          สำหรับแนบเอกสารราชการหรือส่งเบิกจ่าย:
        </p>
        <ul class="check-list">
          <li>ปุ่ม 'พิมพ์' ด้านบน จะแสดงเฉพาะเอกสารแบบฟอร์ม อบก-จ.-01 เท่านั้น (ซ่อนแถบเมนูข้างและปุ่มต่างๆ ทั้งหมดอัตโนมัติ)</li>
          <li>ตั้งชื่อไฟล์ PDF ให้อัตโนมัติเป็น: <strong>SFM-[เลขที่ใบงาน]</strong> เช่น SFM-6090</li>
          <li>รวมข้อมูลหัวข้องาน, สถานที่, ผู้แจ้ง, ช่างผู้ดำเนินการ, ตารางรายการอุปกรณ์ที่ใช้ และช่องลงลายมือชื่อครบถ้วน</li>
          <li>เอกสารที่ยังไม่มีช่างรับงาน จะแสดงขีด (-) สะอาดตา ไม่แสดงข้อความค้างในวงเล็บ</li>
        </ul>
      </div>

      <div class="card">
        <h3 class="card-title" style="color: #047857;">📊 รายงานสรุปใบแจ้งงานซ่อม (PDF & Excel Export)</h3>
        <p style="font-size: 11px; color: #475569; line-height: 1.45; margin-bottom: 2mm;">
          สำหรับผู้บริหารและสรุปผลประจำเดือน:
        </p>
        <ul class="check-list">
          <li>เข้าเมนู 'รายงาน' เลือก 'รายงานสรุปใบงานและอุปกรณ์ที่ใช้ (FM)'</li>
          <li>เลือกช่วงเวลา: ดูทั้งหมด หรือเลือกเฉพาะรอบเดือนที่ต้องการได้</li>
          <li><strong>การปรับปรุงสถานะใหม่ตามคำขอ:</strong><br>
            • กรณี 'เสร็จสิ้น': แสดงวันที่ในวงเล็บ เช่น <strong>เสร็จสิ้น (24/11/2569)</strong><br>
            • กรณี 'รอจัดซื้อ': ย่อเป็น <strong>รอจัดซื้อ/หา (ข้อความที่กรอก - REP-2569-XXX)</strong>
          </li>
          <li>รองรับทั้งไฟล์ PDF (ตารางแนวนอน สวยงาม) และ Excel (.xlsx มี 2 Sheet: สรุปใบงาน และ รายการอุปกรณ์ที่ใช้)</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<!-- SLIDE 11: RACI Matrix -->
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
          <th style="width: 38%;">ขั้นตอน / การดำเนินการ</th>
          <th style="width: 20%; text-align: center;">ผู้ควบคุมงาน (Admin)</th>
          <th style="width: 20%; text-align: center;">ช่างผู้ปฏิบัติงาน (Tech)</th>
          <th style="width: 22%; text-align: center;">เจ้าของบริเวณ (Requester)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1. นำเข้าไฟล์ FM เดิม (ถือเป็นรับงานทันที)</strong></td>
          <td class="center text-yes">✔️ ผู้นำเข้า/ผู้สร้าง</td>
          <td class="center text-no">—</td>
          <td class="center text-no">รับเรื่องจากระบบเดิมแล้ว</td>
        </tr>
        <tr>
          <td><strong>2. มอบหมายงาน / รับงานในภาพรวม</strong></td>
          <td class="center text-yes">✔️ ผู้มอบหมาย</td>
          <td class="center text-yes">✔️ กดรับดำเนินการ</td>
          <td class="center text-no">—</td>
        </tr>
        <tr>
          <td><strong>3. ปฏิบัติงาน / จัดการพัสดุ (3 กรณี)</strong></td>
          <td class="center text-no">—</td>
          <td class="center text-yes">✔️ ปฏิบัติงานจริง</td>
          <td class="center text-no">—</td>
        </tr>
        <tr>
          <td><strong>4. การลงนามรับทราบผลการดำเนินงาน</strong></td>
          <td class="center text-no">—</td>
          <td class="center text-yes">✔️ ยื่นมือถือให้เซ็น</td>
          <td class="center text-yes">✔️ ลงนามตรวจรับบนมือถือช่าง</td>
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

<!-- SLIDE 12: Best Practices & Summary -->
<div class="slide dark" style="padding-top: 10mm;">
  <div class="slide-header">
    <div class="header-left">
      <div class="category-tag">SUMMARY & BEST PRACTICES</div>
      <div class="slide-title">สรุปประโยชน์ของระบบ FM และแนวปฏิบัติที่ดี (Best Practices)</div>
    </div>
    <div class="slide-page-num">12 / 12</div>
  </div>
  <div class="content-area">
    <div class="grid-4">
      <div class="card dark" style="border-top: 4px solid #1d4ed8;">
        <div class="card-subtitle" style="color: #60a5fa;">KEY BENEFIT #1</div>
        <h3 class="card-title" style="color: #ffffff; font-size: 13.5px;">ควบคุมงานเป็นระบบ</h3>
        <p style="font-size: 10.5px; color: #94a3b8; line-height: 1.45;">
          นำเข้าไฟล์ FM เดิมที่รับงานแล้วเข้าสู่ระบบ Stoxy ได้ทันที ลดความซ้ำซ้อน งานไม่ตกหล่น และมีผู้รับผิดชอบชัดเจน
        </p>
      </div>

      <div class="card dark" style="border-top: 4px solid #10b981;">
        <div class="card-subtitle" style="color: #34d399;">KEY BENEFIT #2</div>
        <h3 class="card-title" style="color: #ffffff; font-size: 13.5px;">หลักฐานตรวจรับหน้างาน</h3>
        <p style="font-size: 10.5px; color: #94a3b8; line-height: 1.45;">
          ช่างนำมือถือไปให้เจ้าของพื้นที่ตรวจงานและเซ็นรับทราบทันที มีรูปภาพอุปกรณ์ให้ดูประกอบตอนเบิกพัสดุ
        </p>
      </div>

      <div class="card dark" style="border-top: 4px solid #f59e0b;">
        <div class="card-subtitle" style="color: #fbbf24;">KEY BENEFIT #3</div>
        <h3 class="card-title" style="color: #ffffff; font-size: 13.5px;">เชื่อมโยงระบบจัดซื้อ (veri)</h3>
        <p style="font-size: 10.5px; color: #94a3b8; line-height: 1.45;">
          รองรับการระบุเลขที่ใบเสนอแจ้งซ่อม REP-2569-XXX เพื่อเตรียมพร้อมการควบรวม 2 ระบบเข้าด้วยกันในอนาคต
        </p>
      </div>

      <div class="card dark" style="border-top: 4px solid #a855f7;">
        <div class="card-subtitle" style="color: #c084fc;">KEY BENEFIT #4</div>
        <h3 class="card-title" style="color: #ffffff; font-size: 13.5px;">รายงานตรวจสอบย้อนหลัง</h3>
        <p style="font-size: 10.5px; color: #94a3b8; line-height: 1.45;">
          ผู้บริหารสามารถตรวจสอบประวัติการซ่อมบำรุงและต้นทุนพัสดุที่ใช้ย้อนหลังได้ตลอดเวลาผ่าน PDF/Excel
        </p>
      </div>
    </div>
  </div>
</div>

</body>
</html>
"""

html_path = r"d:\Application\Stoxy\docs\FM_Presentation.html"
with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML saved to: {html_path}")

# Run headless Edge to print to PDF
edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
pdf_path = r"d:\Application\Stoxy\docs\FM_User_Manual_Presentation.pdf"

if os.path.exists(edge_path):
    print("Converting HTML to PDF via Edge headless...")
    cmd = [
        edge_path,
        "--headless",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={pdf_path}",
        "--no-pdf-header-footer",
        html_path
    ]
    subprocess.run(cmd, check=True)
    print(f"PDF successfully generated at: {pdf_path}")
    
    # Also copy to public/docs
    public_pdf = r"d:\Application\Stoxy\public\docs\FM_User_Manual_Presentation.pdf"
    import shutil
    shutil.copyfile(pdf_path, public_pdf)
    print(f"Copied PDF to: {public_pdf}")
else:
    print(f"Edge not found at {edge_path}, please check path.")

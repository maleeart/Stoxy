/**
 * FM PDF OCR / Text Parser Service
 * Parses Thai FM work order PDF documents directly in the browser using native Web Streams API.
 * Extracts all form fields to prefill the FM creation form WITHOUT uploading or storing the file,
 * preserving free-tier storage limits (0 bytes storage used).
 */

export interface ParsedFMData {
  workOrderNumber?: string;
  workType?: string;
  requestDateStr?: string; // YYYY-MM-DD
  useDateStr?: string; // YYYY-MM-DD
  requesterName?: string;
  requesterDepartment?: string;
  requesterEmail?: string;
  requesterPhone?: string;
  coordinatorName?: string;
  coordinatorPhone?: string;
  title?: string;
  description?: string;
  location?: string;
  assignedTechnicianName?: string;
  assignedDepartment?: string;
  assignorName?: string;
  fieldsDetectedCount: number;
}

/**
 * Convert Thai Buddhist Era date string (e.g., "19-10-2569" or "19/10/2569") to ISO YYYY-MM-DD
 */
function toIsoDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  const match = dateStr.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (!match) return undefined;

  let day = parseInt(match[1], 10);
  let month = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);

  // If Buddhist Era (e.g. 2569), convert to Christian Era (2026)
  if (year > 2400) {
    year -= 543;
  }

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Decode Tj byte stream (handles UTF-16BE CID, escape sequences, octal values)
 */
function decodeTj(raw: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "\\" && i + 1 < raw.length) {
      const next = raw[i + 1];
      if (next === "n") {
        bytes.push(10);
        i++;
      } else if (next === "r") {
        bytes.push(13);
        i++;
      } else if (next === "t") {
        bytes.push(9);
        i++;
      } else if (next === "(" || next === ")" || next === "\\") {
        bytes.push(next.charCodeAt(0));
        i++;
      } else if (/[0-7]/.test(next)) {
        let oct = next;
        if (/[0-7]/.test(raw[i + 2])) {
          oct += raw[i + 2];
          i++;
        }
        if (/[0-7]/.test(raw[i + 2])) {
          oct += raw[i + 2];
          i++;
        }
        bytes.push(parseInt(oct, 8));
        i++;
      } else {
        bytes.push(next.charCodeAt(0));
      }
    } else {
      bytes.push(raw.charCodeAt(i));
    }
  }

  // Check if string contains UTF-16BE encoded characters (2 bytes per char)
  let isUtf16 = false;
  if (bytes.length >= 2) {
    // UTF-16BE often has 0x00 as high byte for ASCII or 0x0E for Thai
    let hasHighByte = 0;
    for (let j = 0; j < bytes.length; j += 2) {
      if (bytes[j] === 0x00 || bytes[j] === 0x0e) hasHighByte++;
    }
    if (hasHighByte >= Math.floor(bytes.length / 4)) {
      isUtf16 = true;
    }
  }

  if (isUtf16) {
    let decoded = "";
    for (let j = 0; j < bytes.length; j += 2) {
      if (j + 1 < bytes.length) {
        const code = (bytes[j] << 8) | bytes[j + 1];
        decoded += String.fromCharCode(code);
      }
    }
    return decoded;
  }

  // Fallback to latin1 / standard string
  return bytes.map((b) => String.fromCharCode(b)).join("");
}

/**
 * Decompress a deflate stream using browser's native DecompressionStream
 */
async function decompressDeflate(compressedBytes: Uint8Array): Promise<string> {
  if (typeof DecompressionStream === "undefined") {
    // If DecompressionStream not supported in this runtime
    return new TextDecoder("latin1").decode(compressedBytes);
  }

  try {
    const ds = new DecompressionStream("deflate");
    const writer = ds.writable.getWriter();
    writer.write(compressedBytes);
    writer.close();

    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }

    const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }

    return new TextDecoder("latin1").decode(merged);
  } catch (err) {
    // Return raw if decompression fails
    return new TextDecoder("latin1").decode(compressedBytes);
  }
}

/**
 * Parse an FM PDF File and extract its form fields
 */
export async function parseFMPdf(file: File): Promise<ParsedFMData> {
  const arrayBuffer = await file.arrayBuffer();
  const rawBytes = new Uint8Array(arrayBuffer);
  const pdfStr = new TextDecoder("latin1").decode(rawBytes);

  // Extract all streams
  const streamMatches = [...pdfStr.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)];
  const allLines: string[] = [];

  for (const match of streamMatches) {
    const streamRaw = match[1];
    const streamBytes = new Uint8Array(streamRaw.length);
    for (let i = 0; i < streamRaw.length; i++) {
      streamBytes[i] = streamRaw.charCodeAt(i);
    }

    // Try decompressing
    const decompressed = await decompressDeflate(streamBytes);

    // Look for Tj strings: (text) Tj
    const tjRegex = /\(([\s\S]*?)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(decompressed)) !== null) {
      const decoded = decodeTj(tjMatch[1]);
      if (decoded && decoded.trim()) {
        allLines.push(decoded.trim());
      }
    }
  }

  const result: Partial<ParsedFMData> = {};

  // Parse lines sequentially
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const nextLine = allLines[i + 1] || "";
    const nextNextLine = allLines[i + 2] || "";

    // 1. Work Type
    if ((line.includes("ประเภทงาน") || line.includes("ประเภทงาน :")) && !result.workType) {
      const after = line.split(":")[1]?.trim();
      result.workType = after || (nextLine && !nextLine.includes(":") ? nextLine : undefined);
    }

    // 2. Work Order Number
    if ((line.includes("ใบแจ้งงานเลขที่") || line.includes("เลขที่ใบแจ้งงาน") || line.includes("เลขที่ใบงาน")) && !result.workOrderNumber) {
      const after = line.split(":")[1]?.trim();
      const val = after || nextLine;
      const numMatch = val.match(/\d+/);
      if (numMatch) result.workOrderNumber = numMatch[0];
    }

    // 3. Request Date
    if (line.includes("วันที่แจ้งงาน") && !result.requestDateStr) {
      const after = line.split(":")[1]?.trim();
      const val = after || nextLine;
      const iso = toIsoDate(val);
      if (iso) result.requestDateStr = iso;
    }

    // 4. Use Date
    if (line.includes("วันที่ใช้งาน") && !result.useDateStr) {
      const after = line.split(":")[1]?.trim();
      const val = after || nextLine;
      const iso = toIsoDate(val);
      if (iso) result.useDateStr = iso;
    }

    // 5. Requester Name
    if (line.includes("ชื่อผู้แจ้งงาน") || line.includes("ชื่อผู้แจ้ง")) {
      const after = line.split(":")[1]?.trim();
      result.requesterName = after || nextLine;
    }

    // 6. Requester Department
    if (line.includes("สังกัด") && !result.requesterDepartment) {
      const after = line.split(":")[1]?.trim();
      result.requesterDepartment = after || nextLine;
    }

    // 7. Requester Email
    if ((line.includes("อีเมล์") || line.includes("อีเมล") || line.includes("Email")) && !result.requesterEmail) {
      const after = line.split(":")[1]?.trim();
      const val = after || nextLine;
      const emailMatch = val.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) result.requesterEmail = emailMatch[0];
    }

    // 8. Requester Phone
    if (line.includes("โทร.") && !result.requesterPhone && !line.includes("nan")) {
      const after = line.split(":")[1]?.trim();
      const val = after || nextLine;
      const phoneMatch = val.match(/[0-9-]+/);
      if (phoneMatch && phoneMatch[0].length >= 3 && phoneMatch[0] !== "nan") {
        result.requesterPhone = phoneMatch[0];
      }
    }

    // 9. Coordinator Name
    if (line.includes("ผู้ประสานงาน") && !result.coordinatorName) {
      const after = line.split(":")[1]?.trim();
      result.coordinatorName = after || nextLine;
    }

    // 10. Title / Subject
    if ((line === "เรื่อง :" || line.startsWith("เรื่อง :")) && !result.title) {
      const after = line.replace(/^เรื่อง\s*:\s*/, "").trim();
      result.title = after || nextLine;
    }

    // 11. Description
    if ((line === "รายละเอียด :" || line.startsWith("รายละเอียด :")) && !result.description) {
      const after = line.replace(/^รายละเอียด\s*:\s*/, "").trim();
      let desc = after || nextLine;
      if (nextNextLine && !nextNextLine.includes("สถานที่") && !nextNextLine.includes("เอกสาร")) {
        desc += " " + nextNextLine;
      }
      result.description = desc;
    }

    // 12. Location
    if ((line.includes("สถานที่ :") || line === "สถานที่ :") && !result.location) {
      const after = line.split(":")[1]?.trim();
      result.location = after || nextLine;
    }

    // 13. Assigned Technician
    if ((line === "ผู้ดำเนินการ :" || line.includes("ผู้ดำเนินการ")) && !result.assignedTechnicianName) {
      const after = line.split(":")[1]?.trim();
      const val = after || nextLine;
      if (val && !val.includes("หน่วยงาน") && !val.includes("อีเมล์")) {
        result.assignedTechnicianName = val;
      }
    }

    // 14. Technician Department
    if ((line.includes("หน่วยงาน :") || line === "หน่วยงาน :") && !result.assignedDepartment) {
      const after = line.split(":")[1]?.trim();
      const val = after || nextLine;
      if (val && !val.includes("อีเมล์") && !val.includes("โทร")) {
        result.assignedDepartment = val;
      }
    }

    // 15. Assignor Name
    if ((line === "ผู้มอบหมายงาน :" || line.includes("ผู้มอบหมายงาน")) && !result.assignorName) {
      const after = line.split(":")[1]?.trim();
      const val = after || nextLine;
      if (val && !val.includes("วันที่") && !val.includes("โทร") && !val.includes("อีเมล์")) {
        result.assignorName = val;
      }
    }
  }

  // Extra check for coordinator phone from description (e.g. "ติดต่อ 69605")
  if (!result.coordinatorPhone) {
    const contactMatch = (result.description || "").match(/ติดต่อ\s*([0-9-]+)/);
    if (contactMatch) {
      result.coordinatorPhone = contactMatch[1];
    }
  }

  // Count how many fields were detected
  const fields = [
    result.workOrderNumber,
    result.workType,
    result.requestDateStr,
    result.useDateStr,
    result.requesterName,
    result.requesterDepartment,
    result.requesterEmail,
    result.requesterPhone,
    result.coordinatorName,
    result.coordinatorPhone,
    result.title,
    result.description,
    result.location,
    result.assignedTechnicianName,
    result.assignedDepartment,
    result.assignorName,
  ];
  const fieldsDetectedCount = fields.filter(Boolean).length;

  return {
    ...result,
    fieldsDetectedCount,
  };
}

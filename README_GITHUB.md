# Food Safety Hunting Game — GitHub Frontend V1

Frontend นี้พร้อมใช้กับ GitHub Pages และเชื่อม Google Apps Script Backend แล้ว

Backend:
https://script.google.com/macros/s/AKfycbyiSnHSXyXF0u6JU8G6pdaspCprwBjIf62zS6pOt13M4s9a4I4yZChp9cJiCEozzAH1WA/exec

## ไฟล์หลัก
- `index.html`
- `css/app.css`
- `js/config.js`
- `js/app.js`
- `assets/ui/login-hero.jpg`
- `assets/questions/S1_Q01.jpg`
- `assets/questions/S1_Q02.jpg`

## วิธีขึ้น GitHub Pages
1. สร้าง Repository ใหม่
2. Upload **ไฟล์และ Folder ทั้งหมดในชุดนี้** ไปที่ root ของ repo
3. Commit changes
4. Settings > Pages
5. Build and deployment > Deploy from a branch
6. Branch = `main`, Folder = `/ (root)`
7. Save
8. รอ GitHub สร้าง URL Pages

## วิธีเพิ่มข้อ S1Q03 ภายหลัง
1. สร้างภาพ `S1_Q03.jpg`
2. Upload ไป `assets/questions/S1_Q03.jpg`
3. เปิด `js/config.js`
4. เพิ่ม `"S1Q03"` ใน `ENABLED_QUESTION_IDS`
5. ใน Google Sheet:
   - QUESTIONS: S1Q03 ต้อง Active = TRUE
   - HOTSPOTS: พิกัดของ S1Q03 ต้อง Status = READY

## Security
- Frontend ไม่มี Hotspot/Keyword เฉลย
- Login / Submit / Score ส่งไป Google Apps Script
- Backend ส่งเฉลยกลับหลัง Submit เท่านั้น

## หมายเหตุ
ภาพ S1Q01 / S1Q02 ในแพ็กนี้เป็นภาพปัจจุบันสำหรับทดสอบ Frontend
ถ้ามีภาพเวอร์ชันแก้ "ไม่สอดคล้อง Food Safety" ให้แทนไฟล์เดิมโดยใช้ชื่อเดิมได้ทันที


## Flat Upload Version
ไฟล์ชุดนี้ถูกปรับให้ทุกไฟล์อยู่ระดับเดียวกันใน root ของ GitHub Repository
ไม่ต้องสร้าง folder assets/css/js

โครงสร้าง:
- index.html
- app.css
- config.js
- app.js
- login-hero.jpg
- S1_Q01.jpg
- S1_Q02.jpg
- README_GITHUB.md

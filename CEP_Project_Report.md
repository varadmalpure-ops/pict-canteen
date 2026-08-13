# Community Engagement Project (CEP) Report
**Academic Term:** July 2026  
**Institution:** Pune Institute of Computer Technology (PICT)  

---

## 1. Project Title & Core Objective
**Project Title:** PICT Canteen Ordering System - Digital Queuing & Crowd Management  

**Core Objective:**  
To alleviate the physical single-counter bottleneck at the PICT Canteen during peak rush hours (such as lunch breaks and recess) by implementing a lightweight digital queuing system. The intervention aims to transition the ordering process from a crowded, physical line to a seamless digital workflow, ensuring students can order remotely and approach the counter only when their Token Number is marked as "Ready."

---

## 2. Project Timeline & Logging (July 2026)

| Date (July 2026) | Phase | Activities Performed |
| :--- | :--- | :--- |
| **July 5 - July 8** | Requirements Gathering | Observed peak hour crowding at the canteen. Interviewed 3 canteen staff members and 15 students. |
| **July 9 - July 14** | System Design | Designed mobile-first UI with Tailwind CSS and established the Firebase schema for real-time tracking. |
| **July 15 - July 19** | Development | Built the frontend (Student & Admin views) and integrated real-time state management. |
| **July 20 - July 22** | Local Deployment | Populated database with local staples (Vada Pav, Misal, etc.) and conducted internal load testing. |
| **July 23 - July 28** | Field Testing | Pilot run at the canteen during recess. (Observations recorded below). |
| **July 29 - July 31** | Feedback & Iteration | Collected feedback, analyzed impact, and finalized this report. |

---

## 3. Execution Phase

### 3.1 Local Software Deployment
- **Architecture**: The application was built as a Single Page Application (SPA) using React (Vite) and Tailwind CSS. The real-time synchronization between the student ordering interface and the canteen kitchen display was powered by Firebase Firestore.
- **Data Seeding**: A database initialization script (`initDb.ts`) was executed to populate standard menu items such as Misal Pav, Vada Pav, and Cold Coffee with current INR pricing.

### 3.2 Field Testing
- **Deployment Strategy**: The application was deployed locally via the campus Wi-Fi. QR codes linking to the local IP address were placed outside the canteen.
- **Staff Training**: Canteen staff were given a 10-minute briefing on using the tablet-based Admin UI, specifically the 1-tap state advancement toggles and inventory switches.

---

## 4. Community Feedback

### 4.1 Canteen Staff Insights (Admin UI)
*Document feedback regarding the high-contrast dashboard, touch target sizes, and inventory management.*
- **Ease of Use:** 
- **Operational Speed:**
- **Suggested Improvements:** 

### 4.2 Student Insights (Ordering Workflow)
*Document feedback regarding the 3-click ordering flow, UI responsiveness, and token tracking.*
- **User Experience:**
- **Clarity of Instructions:**
- **Suggested Improvements:**

---

## 5. Impact Analysis & Conclusion

**Impact Analysis:**
- **Crowd Reduction:** Evaluate the observed reduction in physical crowding immediately in front of the payment counter.
- **Order Throughput:** Analyze if the streamlined digital ordering and prep-station visibility increased the number of orders fulfilled per hour.
- **Error Reduction:** Assess the reduction in misheard orders due to loud environments, as all orders were digitally itemized.

**Conclusion:**
By addressing the critical single-counter bottleneck through a digital intervention, this project successfully bridges the gap between technology and everyday campus life. The transition to a digital Token Number system not only optimized the canteen's operational efficiency but also significantly improved the student experience during the July 2026 academic term.

---
*Signatures / Project Members:*
1. ______________________
2. ______________________
3. ______________________

// types/officialEvent.ts

// 1. โครงสร้างข้อมูลสำหรับ ลำดับพิธีการ (Timeline)
export interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  isCompleted: boolean;
}

// 2. โครงสร้างข้อมูลสำหรับ จัดการหน่วยงานและผู้เชิญพานพุ่ม
export interface AgencyBearer {
  id: string;
  agencyName: string;
  bearerName: string;
  sequence: number; // ลำดับการวางพานพุ่ม
  status: 'pending' | 'ready' | 'completed';
}

// 3. โครงสร้างข้อมูลสำหรับ Checklist เครื่องพิธี
export interface EquipmentChecklist {
  id: string;
  itemName: string;
  category: 'stage' | 'ceremony' | 'audio';
  isReady: boolean;
}

// 4. โครงสร้างข้อมูลสำหรับ สคริปต์พิธีกร
export interface McScript {
  id: string;
  sequence: number;
  cue: string; 
  scriptText: string;
}
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

// 1. กำหนด Interface ให้สอดคล้องกับโครงสร้างข้อมูลที่ดึงมาจาก Supabase
interface Course {
    id: string;
    edu_curriculum_master: {
        subject_code: string;
        subject_name: string;
        credit: number;
        hours_per_week: number;
        subject_type: string;
    };
    edu_profiles?: {
        name: string;
    };
}

export default function CourseManagement() {
    const router = useRouter();
    const [term, setTerm] = useState('1/2569');
    const [grade, setGrade] = useState('ม.4');
    
    // 2. ระบุ Type ให้กับ useState ตรงนี้เลยครับ
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchCourses = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('edu_term_courses')
            .select(`
                id, 
                edu_curriculum_master(subject_code, subject_name, credit, hours_per_week, subject_type),
                edu_profiles(name)
            `)
            .eq('term', term)
            .eq('grade_level', grade);

        if (error) {
            console.error("Error fetching courses:", error);
        } else if (data) {
            // ตอนนี้ data จะเป็น Array ของ Course ตามที่เราประกาศไว้
            setCourses(data as unknown as Course[]);
        }
        setLoading(false);
    };

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">จัดการรายวิชาภาคเรียน</h1>
            
            <div className="flex gap-4 mb-6">
                <input className="p-2 border rounded" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="ภาคเรียน (เช่น 1/2569)" />
                <input className="p-2 border rounded" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="ระดับชั้น (เช่น ม.4)" />
                <button onClick={fetchCourses} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2">
                    <Search size={16} /> ตกลง
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-100 border-b">
                        <tr>
                            <th className="p-4">รหัสวิชา</th>
                            <th className="p-4">รายวิชา</th>
                            <th className="p-4">หน่วยกิต</th>
                            <th className="p-4">เวลาเรียน/สัปดาห์</th>
                            <th className="p-4">ประเภท</th>
                            <th className="p-4">ครูผู้สอน</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* ไม่ต้องใช้ :any แล้ว เพราะ TypeScript รู้จักโครงสร้าง Course แล้ว */}
                        {courses.map((c) => (
                            <tr 
                                key={c.id} 
                                className="border-b hover:bg-blue-50 cursor-pointer transition-colors"
                                onClick={() => router.push(`/edu/courses/${c.id}`)}
                            >
                                <td className="p-4">{c.edu_curriculum_master.subject_code}</td>
                                <td className="p-4 font-semibold">{c.edu_curriculum_master.subject_name}</td>
                                <td className="p-4">{c.edu_curriculum_master.credit}</td>
                                <td className="p-4">{c.edu_curriculum_master.hours_per_week}</td>
                                <td className="p-4">{c.edu_curriculum_master.subject_type}</td>
                                <td className="p-4">{c.edu_profiles?.name || 'ยังไม่ระบุ'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
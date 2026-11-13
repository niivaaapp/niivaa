'use server'

import { createClient } from '@/utils/supabase/server';

export async function getPlanningMasterData() {
    const supabase = await createClient();
    try {
        const { data: schools } = await supabase.schema('core').from('schools').select('id').limit(1);
        const school_id = schools?.[0]?.id;
        
        if (!school_id) return { success: false, projects: [], activities: [] };

        // ดึงโครงการทั้งหมดเรียงตามรหัส
        const { data: projects } = await supabase.schema('core')
            .from('projects')
            .select('*')
            .eq('school_id', school_id)
            .order('project_code', { ascending: true });

        // ดึงกิจกรรมทั้งหมดเรียงตามรหัส
        const { data: activities } = await supabase.schema('core')
            .from('activities')
            .select('*')
            .eq('school_id', school_id)
            .order('activity_code', { ascending: true });

        return { success: true, projects: projects || [], activities: activities || [] };
    } catch (error) {
        console.error("Fetch Master Data Error:", error);
        return { success: false, projects: [], activities: [] };
    }
}
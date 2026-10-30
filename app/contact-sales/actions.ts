// app/contact-sales/actions.ts
'use server'

import { createClient } from '@/utils/supabase/server'

export async function submitContactForm(formData: FormData) {
  const supabase = await createClient()

  // ดึงข้อมูลจากฟอร์ม
  const contactName = formData.get('contact_name') as string
  const organizationName = formData.get('organization_name') as string
  const phoneNumber = formData.get('phone_number') as string
  const email = formData.get('email') as string
  const lineId = formData.get('line_id') as string
  const teamSize = formData.get('team_size') as string
  const durationMonths = formData.get('duration_months') as string

  // บันทึกลงตาราง enterprise_leads
  const { error } = await supabase
    .from('enterprise_leads')
    .insert({
      contact_name: contactName,
      organization_name: organizationName,
      phone_number: phoneNumber,
      email: email,
      line_id: lineId ? lineId : null,
      team_size: teamSize,
      duration_months: durationMonths
    })

  if (error) {
    console.error('Database Error:', error)
    return { success: false, error: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง / System error, please try again.' }
  }

  return { success: true }
}
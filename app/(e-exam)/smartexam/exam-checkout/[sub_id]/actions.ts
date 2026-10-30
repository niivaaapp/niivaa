// app/(e-exam)/smartexam/exam-checkout/[sub_id]/actions.ts
'use server'

import { createClient as createServerClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js' // 🌟 1. นำเข้า Admin Client
import { redirect } from 'next/navigation'

export async function verifyExamSlipAction(formData: FormData, subId: string, expectedAmount: number) {
  const supabase = await createServerClient()
  const slipFile = formData.get('slip') as File

  if (!slipFile || slipFile.size === 0) {
    return { success: false, error: 'กรุณาอัปโหลดรูปภาพสลิป / Please upload a slip image.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'เซสชันหมดอายุ กรุณาล็อกอินใหม่' }
  }

  const { data: subData } = await supabase
    .from('subscriptions')
    .select('org_id')
    .eq('id', subId)
    .single()

  if (!subData) {
    return { success: false, error: 'ไม่พบข้อมูลคำสั่งซื้อ / Order not found.' }
  }

  const fileExt = slipFile.name.split('.').pop()
  const fileName = `exam-slips/${user.id}/${subId}-${Date.now()}.${fileExt}`
  
  const { error: uploadError } = await supabase.storage
    .from('slips')
    .upload(fileName, slipFile)

  if (uploadError) {
    return { success: false, error: 'อัปโหลดไฟล์ไม่สำเร็จ: ' + uploadError.message }
  }

  try {
    const apiFormData = new FormData()
    apiFormData.append('files', slipFile)

    const slipokToken = process.env.SLIPOK_TOKEN_EXAM
    if (!slipokToken) {
      return { success: false, error: 'ไม่พบรหัส Token ของสาขา SmartExam ในระบบ' }
    }

    const apiResponse = await fetch('https://api.slipok.com/api/v1/detect', {
      method: 'POST',
      headers: {
        'x-logineasy-token': slipokToken
      },
      body: apiFormData
    })

    const apiData = await apiResponse.json()

    if (!apiResponse.ok || !apiData.success) {
      return { success: false, error: 'สลิปไม่ถูกต้อง หรือไม่พบ QR Code ธนาคาร' }
    }

    const slipInfo = apiData.data

    if (Number(slipInfo.amount) !== Number(expectedAmount)) {
      return { success: false, error: `ยอดเงินโอนไม่ตรง (โอนมา ${slipInfo.amount} บาท แต่ยอดชำระคือ ${expectedAmount} บาท)` }
    }

    // 🌟 2. สร้าง Admin Client เพื่อจัดการ Database โดยไม่ต้องกังวลเรื่อง RLS
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 🌟 3. บันทึกลงตาราง payments ด้วย Admin
    const { error: paymentError } = await supabaseAdmin.from('payments').insert({
      org_id: subData.org_id,
      profile_id: user.id,
      subscription_id: subId,
      amount: expectedAmount,
      currency: 'THB',
      payment_channel: 'promptpay_slip',
      slip_url: fileName,
      trans_ref: slipInfo.trans_ref,
      status: 'approved',
      raw_payload: slipInfo,
      paid_at: new Date().toISOString()
    })

    if (paymentError) {
      if (paymentError.code === '23505') {
        return { success: false, error: 'สลิปนี้ถูกใช้งานไปแล้ว ไม่สามารถส่งซ้ำได้' }
      }
      throw paymentError
    }

    // 🌟 4. อัปเดตสิทธิ์การใช้งานด้วย Admin
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('id', subId)

  } catch (apiErr) {
    console.error('SmartExam Slip verification error:', apiErr)
    return { success: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบสลิป กรุณาลองใหม่อีกครั้ง' }
  }

  redirect('/smartexam/dashboard')
}
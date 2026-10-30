// app/(event)/event-checkout/[sub_id]/actions.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function verifyEventSlipAction(formData: FormData, subId: string, expectedAmount: number) {
  const supabase = await createClient()
  const slipFile = formData.get('slip') as File

  if (!slipFile || slipFile.size === 0) {
    return { success: false, error: 'กรุณาอัปโหลดรูปภาพสลิป / Please upload a slip image.' }
  }

  // 1. ตรวจสอบสิทธิ์ผู้ใช้งาน (Unified Auth)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'เซสชันหมดอายุ กรุณาล็อกอินใหม่' }
  }

  // 2. ดึงข้อมูล Subscription
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('org_id')
    .eq('id', subId)
    .single()

  if (!subData) {
    return { success: false, error: 'ไม่พบข้อมูลคำสั่งซื้อ / Order not found.' }
  }

  // 3. อัปโหลดรูปสลิปไปที่ Supabase Storage
  const fileExt = slipFile.name.split('.').pop()
  const fileName = `event-slips/${user.id}/${subId}-${Date.now()}.${fileExt}`
  
  const { error: uploadError } = await supabase.storage
    .from('slips')
    .upload(fileName, slipFile)

  if (uploadError) {
    return { success: false, error: 'อัปโหลดไฟล์ไม่สำเร็จ: ' + uploadError.message }
  }

  // 4. 🌟 เรียกใช้ SlipOK API โดยใช้ Token ของสาขา NiiVaaSmartEvent
  try {
    const apiFormData = new FormData()
    apiFormData.append('files', slipFile)

    const slipokToken = process.env.SLIPOK_TOKEN_EVENT

    if (!slipokToken) {
      return { success: false, error: 'ไม่พบรหัส Token ของสาขา SmartEvent ในระบบ' }
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

    // ตรวจสอบยอดเงิน
    if (Number(slipInfo.amount) !== Number(expectedAmount)) {
      return { success: false, error: `ยอดเงินโอนไม่ตรง (โอนมา ${slipInfo.amount} บาท แต่ยอดชำระคือ ${expectedAmount} บาท)` }
    }

    // 5. บันทึกลงตาราง payments
    const { error: paymentError } = await supabase.from('payments').insert({
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

    // 6. อัปเดตสิทธิ์ระบบ SmartEvent
    await supabase
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('id', subId)

  } catch (apiErr) {
    console.error('SmartEvent Slip verification error:', apiErr)
    return { success: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบสลิป กรุณาลองใหม่อีกครั้ง' }
  }

  // 7. เมื่อชำระเงินสำเร็จ นำผู้ใช้ไปยังหน้า Dashboard ของ SmartEvent
  redirect('/eventdashboard')
}
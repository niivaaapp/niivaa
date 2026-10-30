// app/(media)/checkout/[sub_id]/actions.ts
'use server'

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function verifySlipAction(formData: FormData, planId: string, appId: string, expectedAmount: number) {
  const supabase = await createClient();
  const slipFile = formData.get('slip') as File;

  // 1. ตรวจสอบไฟล์และผู้ใช้
  if (!slipFile || slipFile.size === 0) {
    return { success: false, error: 'กรุณาอัปโหลดรูปภาพสลิป' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'เซสชันหมดอายุ กรุณาล็อกอินใหม่' };
  }

  // 🌟 [ปรับปรุง] ดึงข้อมูล Plan พร้อม Join ชื่อ App มาด้วยเพื่อแยกแอปพลิเคชัน
  const { data: planData } = await supabase
    .from('plans')
    .select('duration_days, apps(name)')
    .eq('id', planId)
    .single();

  if (!planData) {
    return { success: false, error: 'ไม่พบข้อมูลแพ็กเกจ' };
  }

  // 🌟 [ปรับปรุง] ตั้งค่าตัวแปรตามแอปพลิเคชันแบบอัตโนมัติ
  // @ts-ignore
  const appName = planData.apps?.name || '';

  let SERVICE_CODE = 'SMART_MEDIA';
  let workspaceName = 'SmartMedia Studio';
  let targetAppParam = 'media'; // ใช้สำหรับส่งไปหน้า Welcome กลาง

  if (appName.includes('SmartEvent')) {
    SERVICE_CODE = 'SMART_EVENT';
    workspaceName = 'SmartEvent Manager';
    targetAppParam = 'event';
  } else if (appName.includes('SmartExam')) {
    SERVICE_CODE = 'SMART_EXAM';
    workspaceName = 'SmartExam Center';
    targetAppParam = 'exam';
  }

  // 2. อัปโหลดรูปสลิปเก็บไว้เป็นหลักฐานใน Storage
  const fileExt = slipFile.name.split('.').pop();
  const fileName = `${user.id}/slip-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage.from('slips').upload(fileName, slipFile);
  if (uploadError) {
    return { success: false, error: 'อัปโหลดไฟล์ไม่สำเร็จ: ' + uploadError.message };
  }

  // 3. 🌟 เรียกใช้ Slip2Go API
  try {
    const apiKey = process.env.SLIP2GO_API_KEY?.trim();
    // ⚠️ ตรวจสอบ URL จริงของ Slip2Go สำหรับการแนบรูปภาพ
    const apiUrl = process.env.SLIP2GO_API_URL?.trim() || 'api.slip2go.com';

    if (!apiKey) return { success: false, error: 'ตั้งค่า SLIP2GO_API_KEY ไม่ครบถ้วน' };

    // 🎯 สร้างฟอร์มข้อมูลแนบไฟล์รูปภาพ
    const apiFormData = new FormData();
    apiFormData.append('file', slipFile, slipFile.name || 'slip.jpg');

    // 🎯 ยิง API ไปยัง Slip2Go (ใช้ Endpoint ตรวจรูปภาพของแท้)
    const apiResponse = await fetch('https://connect.slip2go.com/api/verify-slip/qr-image/info', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: apiFormData
    });

    const apiData = await apiResponse.json();

    console.log('=== SLIP2GO RESPONSE DEBUG ===');
    console.log('HTTP Status:', apiResponse.status);
    console.log('Response Data:', JSON.stringify(apiData, null, 2));

    // 🎯 ตรวจสอบผลลัพธ์
    if (!apiData.data) {
      return {
        success: false,
        error: `ไม่สามารถอ่านข้อมูลสลิปได้: ${apiData.message || 'รูปภาพอาจไม่ชัดเจน'}`
      };
    }

    const slipInfo = apiData.data;

    // 🛑 ด่านที่ 1: ตรวจสอบยอดเงินโอน
    if (Number(slipInfo.amount) !== Number(expectedAmount)) {
      return {
        success: false,
        error: `ยอดเงินโอนไม่ตรง (สลิปโอนมา ${slipInfo.amount} บาท แต่งวดนี้คือ ${expectedAmount} บาท)`
      };
    }

    // 🛑 ด่านที่ 2: ตรวจสอบบัญชีรับเงิน
    const receiverName = slipInfo.accountName || slipInfo.receiverName || '';
    const isNiiVaaAccount = receiverName.includes('นิวัติ ภัคภูริวัฒน์') || receiverName.includes('NIWAT');

    if (!isNiiVaaAccount && process.env.NODE_ENV === 'production') {
      return { success: false, error: 'สลิปนี้ไม่ได้โอนเข้าบัญชีที่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' };
    }

    // =========================================================================
    // 🌟 4. PROVISIONING (สร้างระบบให้ลูกค้าอัตโนมัติ)
    // =========================================================================

    // 4.1 ค้นหาหรือสร้าง องค์กร
    let orgId = null;
    const { data: memberData } = await supabase
      .from('organization_members')
      .select('org_id')
      .eq('profile_id', user.id)
      .eq('org_role', 'owner')
      .limit(1)
      .maybeSingle();

    if (memberData && memberData.org_id) {
      orgId = memberData.org_id;
    } else {
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: `Workspace ของ ${user.user_metadata?.full_name || 'คุณ'}` })
        .select('id')
        .single();

      if (orgError) throw new Error(`สร้างองค์กรล้มเหลว: ${orgError.message}`);
      orgId = newOrg.id;

      const { error: memberError } = await supabase.from('organization_members').insert({
        org_id: orgId, profile_id: user.id, org_role: 'owner'
      });
      if (memberError) throw new Error(`สร้างสมาชิกองค์กรล้มเหลว: ${memberError.message}`);
    }

    // 4.2 สร้าง Subscription (สถานะ Active)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (planData.duration_days || 30));

    const { data: newSub, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        org_id: orgId,
        plan_id: planId,
        status: 'active',
        start_date: new Date().toISOString(),
        valid_until: validUntil.toISOString(),
        cancel_at_period_end: false
      })
      .select('id')
      .single();

    if (subError) throw new Error(`สร้างแพ็กเกจล้มเหลว: ${subError.message}`);
    const newSubId = newSub.id;

    // 4.3 สร้าง พื้นที่ทำงาน UI (Workspaces) - 🌟 [ปรับปรุง] ใช้ตัวแปรแบบไดนามิก
    const { data: existingWorkspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .eq('service_code', SERVICE_CODE)
      .maybeSingle();

    if (!existingWorkspace) {
      const { error: wsError } = await supabase.from('workspaces').insert({
        owner_id: user.id,
        service_code: SERVICE_CODE,
        workspace_name: workspaceName,
        theme_config: { primary_color: "#14b8a6" },
        is_private: true
      });
      if (wsError) throw new Error(`สร้างแผงควบคุมล้มเหลว: ${wsError.message}`);
    }

    // =========================================================================
    // 5. 💾 บันทึกประวัติชำระเงินลงตาราง payments
    // =========================================================================

    const transactionReference = slipInfo.qrCode || slipInfo.transRef || slipInfo.ref || `slip-${Date.now()}`;

    const { error: paymentError } = await supabase.from('payments').insert({
      org_id: orgId,
      profile_id: user.id,
      subscription_id: newSubId,
      amount: expectedAmount,
      currency: 'THB',
      payment_channel: 'promptpay_slip',
      slip_url: fileName,
      trans_ref: transactionReference,
      status: 'approved',
      raw_payload: slipInfo,
      paid_at: new Date().toISOString()
    });

    if (paymentError) {
      if (paymentError.code === '23505') {
        return { success: false, error: 'สลิปนี้ถูกใช้งานไปแล้ว ไม่สามารถส่งซ้ำได้' };
      }
      throw paymentError;
    }

  } catch (err: any) {
    console.error('Checkout Provisioning Error:', err);
    return { success: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบสลิป หรือจัดเตรียมระบบ กรุณาติดต่อแอดมิน' };
  }

  // 6. 🎉 ส่งผู้ใช้ไปยังหน้า Welcome กลาง พร้อมแนบตัวแปร App
  // (ต้องสร้างหน้า Welcome กลางไว้ที่ app/welcome/page.tsx ตามโค้ดก่อนหน้านี้)
  redirect(`/welcome?status=payment_success&app=${targetAppParam}`);
}
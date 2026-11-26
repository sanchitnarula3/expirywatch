import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: requester, error: requesterError } = await admin
      .from("profiles")
      .select("role, department")
      .eq("id", user.id)
      .single();

    if (requesterError || !requester || requester.role === "staff") {
      return NextResponse.json({ message: "Member directory is not available." }, { status: 403 });
    }

    let query = admin
      .from("profiles")
      .select("id, full_name, email, role, department")
      .neq("id", user.id)
      .order("full_name", { ascending: true });

    if (requester.role === "dept_head") {
      query = query.eq("department", requester.department).eq("role", "staff");
    } else {
      query = query.in("role", ["dept_head", "staff"]);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ members: data || [] });
  } catch (error) {
    console.error("Member directory failed:", error);
    return NextResponse.json({ message: "Member directory could not be loaded." }, { status: 500 });
  }
}

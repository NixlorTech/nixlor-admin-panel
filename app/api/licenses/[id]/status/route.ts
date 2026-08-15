import { NextResponse } from "next/server";
import { LicenseStatus } from "@/lib/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type UpdateStatusBody = {
  status: LicenseStatus;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  let body: UpdateStatusBody;
  try {
    body = (await request.json()) as UpdateStatusBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Object.values(LicenseStatus).includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const license = await prisma.license.findUnique({ where: { id } });
  if (!license) {
    return NextResponse.json({ error: "License not found" }, { status: 404 });
  }

  const updated = await prisma.license.update({
    where: { id },
    data: { status: body.status },
  });

  return NextResponse.json(updated);
}

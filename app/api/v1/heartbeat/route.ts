import { NextResponse } from "next/server";
import { LicenseStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type HeartbeatBody = {
  clientId: string;
  module: string;
};

export async function POST(request: Request) {
  let body: HeartbeatBody;
  try {
    body = (await request.json()) as HeartbeatBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { clientId, module } = body;

  if (!clientId || !module) {
    return NextResponse.json(
      { error: "clientId and module are required" },
      { status: 400 },
    );
  }

  const license = await prisma.license.findFirst({
    where: {
      clientId,
      softwareModule: {
        name: module.trim(),
      },
    },
    include: {
      softwareModule: true,
    },
  });

  if (!license) {
    return NextResponse.json({ status: "REVOKED" }, { status: 403 });
  }

  const now = new Date();
  const isExpired = license.expiresAt < now;

  if (license.status === LicenseStatus.REVOKED || isExpired) {
    if (isExpired && license.status !== LicenseStatus.EXPIRED) {
      await prisma.license.update({
        where: { id: license.id },
        data: { status: LicenseStatus.EXPIRED },
      });
    }

    return NextResponse.json({ status: "REVOKED" }, { status: 403 });
  }

  const updated = await prisma.license.update({
    where: { id: license.id },
    data: { lastHeartbeatAt: now },
    include: {
      softwareModule: true,
    },
  });

  return NextResponse.json({
    status: "ACTIVE",
    expiresAt: updated.expiresAt.toISOString(),
    module: updated.softwareModule.name,
  });
}

"use client";

import { DEMO_USER } from "@/lib/demo-data";
import { ProfileModule } from "@/components/profile-module";

export function PreviewProfile() {
  return (
    <ProfileModule
      user={{
        email: DEMO_USER.email,
        name: DEMO_USER.name,
        nickname: DEMO_USER.nickname,
        dob: DEMO_USER.dob,
        timezone: DEMO_USER.timezone,
        theme: DEMO_USER.theme,
        image: DEMO_USER.image,
        viaGoogle: DEMO_USER.viaGoogle,
        createdAt: DEMO_USER.createdAt,
        remindersEnabled: DEMO_USER.remindersEnabled,
        reminderStyle: DEMO_USER.reminderStyle,
        planningStyle: DEMO_USER.planningStyle,
        lifeSituation: DEMO_USER.lifeSituation,
        responsibilities: DEMO_USER.responsibilities,
        interests: DEMO_USER.interests,
        habitFocus: DEMO_USER.habitFocus,
        wakeTime: DEMO_USER.wakeTime,
        bedTime: DEMO_USER.bedTime,
        phoneBeforeBed: DEMO_USER.phoneBeforeBed,
        phoneAfterWake: DEMO_USER.phoneAfterWake,
      }}
    />
  );
}

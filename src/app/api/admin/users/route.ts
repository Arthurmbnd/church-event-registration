
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Used only to verify the user's access token.
const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);

// Server-side admin client.
// NEVER expose this key to the browser.
const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const allowedRoles = [
  "admin",
  "event_staff",
  "reports",
];

async function getAdminUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      user: null,
      error: "Missing authorization token.",
    };
  }

  const token = authorization.replace("Bearer ", "").trim();

  // Verify the access token.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return {
      user: null,
      error: "Invalid or expired session.",
    };
  }

  // Use the service-role client to read profiles.
  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

  if (profileError) {
    console.error("Profile lookup error:", profileError);

    return {
      user: null,
      error: "Unable to verify your role.",
    };
  }

  if (profile?.role !== "admin") {
    return {
      user: null,
      error: "Administrator access required.",
    };
  }

  return {
    user,
    error: null,
  };
}

/* =========================================================
   GET - List system users
   ========================================================= */

export async function GET(request: NextRequest) {
  const { user, error } = await getAdminUser(request);

  if (!user) {
    return NextResponse.json(
      { error },
      { status: 403 }
    );
  }

  const {
    data: profiles,
    error: profilesError,
  } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, full_name, role, created_at"
    )
    .order("created_at", {
      ascending: true,
    });

  if (profilesError) {
    console.error(
      "Profiles loading error:",
      profilesError
    );

    return NextResponse.json(
      {
        error: profilesError.message,
      },
      { status: 500 }
    );
  }

  const usersWithEmails = await Promise.all(
    (profiles || []).map(async (profile) => {
      const {
        data: { user: authUser },
        error: authError,
      } =
        await supabaseAdmin.auth.admin.getUserById(
          profile.id
        );

      if (authError) {
        console.error(
          "Auth user lookup error:",
          authError
        );
      }

      return {
        id: profile.id,
        full_name: profile.full_name,
        role: profile.role,
        created_at: profile.created_at,
        email: authUser?.email || "",
      };
    })
  );

  return NextResponse.json({
    users: usersWithEmails,
  });
}

/* =========================================================
   POST - Create a new staff user
   ========================================================= */

export async function POST(request: NextRequest) {
  const { user, error } = await getAdminUser(request);

  if (!user) {
    return NextResponse.json(
      { error },
      { status: 403 }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request body.",
      },
      { status: 400 }
    );
  }

  const fullName = String(
    body.full_name || ""
  ).trim();

  const email = String(
    body.email || ""
  ).trim().toLowerCase();

  const password = String(
    body.password || ""
  );

  const role = String(
    body.role || ""
  ).trim();

  if (!fullName) {
    return NextResponse.json(
      {
        error: "Full name is required.",
      },
      { status: 400 }
    );
  }

  if (!email) {
    return NextResponse.json(
      {
        error: "Email is required.",
      },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      {
        error:
          "Password must be at least 6 characters.",
      },
      { status: 400 }
    );
  }

  if (!allowedRoles.includes(role)) {
    return NextResponse.json(
      {
        error: "Invalid role selected.",
      },
      { status: 400 }
    );
  }

  // Create Supabase Auth user.
  const {
    data: createdUser,
    error: createError,
  } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError || !createdUser.user) {
    console.error(
      "User creation error:",
      createError
    );

    return NextResponse.json(
      {
        error:
          createError?.message ||
          "Unable to create user.",
      },
      { status: 400 }
    );
  }

  const newUserId = createdUser.user.id;

  // Create matching profile.
  const { error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .insert({
        id: newUserId,
        full_name: fullName,
        role,
      });

  // If profile creation fails, remove the Auth account
  // so we don't leave an incomplete user behind.
  if (profileError) {
    console.error(
      "Profile creation error:",
      profileError
    );

    await supabaseAdmin.auth.admin.deleteUser(
      newUserId
    );

    return NextResponse.json(
      {
        error:
          "User account could not be completed. The account was rolled back.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      message: "User created successfully.",
      user: {
        id: newUserId,
        full_name: fullName,
        email,
        role,
      },
    },
    { status: 201 }
  );
}

/* =========================================================
   PATCH - Update user role
   ========================================================= */

export async function PATCH(request: NextRequest) {
  const { user, error } = await getAdminUser(request);

  if (!user) {
    return NextResponse.json(
      { error },
      { status: 403 }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request body.",
      },
      { status: 400 }
    );
  }

  const userId = String(
    body.user_id || ""
  ).trim();

  const role = String(
    body.role || ""
  ).trim();

  if (!userId) {
    return NextResponse.json(
      {
        error: "User ID is required.",
      },
      { status: 400 }
    );
  }

  if (!allowedRoles.includes(role)) {
    return NextResponse.json(
      {
        error: "Invalid role selected.",
      },
      { status: 400 }
    );
  }

  // Prevent the currently logged-in administrator
  // from accidentally removing their own admin access.
  if (userId === user.id && role !== "admin") {
    return NextResponse.json(
      {
        error:
          "You cannot remove your own administrator access.",
      },
      { status: 400 }
    );
  }

  const { error: updateError } =
    await supabaseAdmin
      .from("profiles")
      .update({
        role,
      })
      .eq("id", userId);

  if (updateError) {
    console.error(
      "Role update error:",
      updateError
    );

    return NextResponse.json(
      {
        error: updateError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message:
      "User role updated successfully.",
  });
}

/* =========================================================
   DELETE - Delete a system user
   ========================================================= */

export async function DELETE(request: NextRequest) {
  const { user, error } = await getAdminUser(request);

  if (!user) {
    return NextResponse.json(
      { error },
      { status: 403 }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request body.",
      },
      { status: 400 }
    );
  }

  const userId = String(
    body.user_id || ""
  ).trim();

  if (!userId) {
    return NextResponse.json(
      {
        error: "User ID is required.",
      },
      { status: 400 }
    );
  }

  // Prevent an administrator from deleting their own account.
  if (userId === user.id) {
    return NextResponse.json(
      {
        error:
          "You cannot delete your own administrator account.",
      },
      { status: 400 }
    );
  }

  // There is no foreign key cascade from profiles.id
  // to auth.users.id, so delete the profile explicitly.
  const { error: profileDeleteError } =
    await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

  if (profileDeleteError) {
    console.error(
      "Profile deletion error:",
      profileDeleteError
    );

    return NextResponse.json(
      {
        error:
          "Unable to delete the user's profile.",
      },
      { status: 500 }
    );
  }

  // Delete the corresponding Supabase Auth account.
  const { error: authDeleteError } =
    await supabaseAdmin.auth.admin.deleteUser(
      userId
    );

  if (authDeleteError) {
    console.error(
      "Auth user deletion error:",
      authDeleteError
    );

    return NextResponse.json(
      {
        error:
          "The profile was deleted, but the authentication account could not be deleted.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "User deleted successfully.",
  });
}


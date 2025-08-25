import { SupabaseClient, User } from "@supabase/supabase-js";
import { Post, PostAuthor } from "../models/post";
import { z } from "zod";


export const getProfileData = async (
  supabase: SupabaseClient,
  user: User,
  profileId: string
): Promise<z.infer<typeof PostAuthor>> => {
  try {
    const { error, data } = await supabase
      .from("profile")
      .select("*")
      .eq("id", profileId)
      .single();
    if (error) {
      console.error(error);
      throw error;
    }
    return PostAuthor.parse(data);
  } catch (error) {
    console.error("Error fetching feed:", error);
    throw error;
  }
};


export const getFollowing = async (
  supabase: SupabaseClient,
  user: User
): Promise<z.infer<typeof PostAuthor>[]> => {
  try {
    const { error, data: followers } = await supabase
      .from("follow")
      .select("following_id")
      .eq("follower_id", user.id);
    if (!followers || followers.length === 0) return [];

    const followingIds = followers.map((follower) => follower.following_id);

    const { error: errors, data } = await supabase
      .from("profile")
      .select("*")
      .in("id", followingIds);

    if (error || errors) {
      console.log(error);
      throw error;
    }
    if (!data) return [];
    return data.map((entry) => PostAuthor.parse(entry));
  } catch (error) {
    console.log(error);
    throw error;
  }
};


export const getProfilePosts = async (
  supabase: SupabaseClient,
  user: User,
  profileId: string,
  cursor: number
): Promise<z.infer<typeof Post>[]> => {
  try {
    const { error, data } = await supabase
      .from("post")
      .select("*, author:profile!post_author_id_fkey(*), likes:like(*)")
      .eq("author_id", profileId)
      .order("posted_at", { ascending: false })
      .range(cursor, cursor + 24);
    if (error) {
      console.error(error);
      throw error;
    }
    if (!data) return [];
    return data.map((post) => Post.parse(post));
  } catch (error) {
    console.error(error);
    throw error;
  }
};


export const toggleFollowing = async (
  supabase: SupabaseClient,
  user: User,
  profileId: string
): Promise<void> => {
  try {
    const { error, data } = await supabase
      .from("follow")
      .select("following_id")
      .eq("follower_id", user.id)
      .eq("following_id", profileId);
    if (error) {
      console.error("error");
      throw error;
    }
    if (Array.isArray(data) && data.length > 0) {
      const { error } = await supabase
        .from("follow")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profileId);
      if (error) {
        console.error("error");
        throw error;
      }
    } else {
      const { error } = await supabase
        .from("follow")
        .insert([{ follower_id: user.id, following_id: profileId }])
        .eq("follower_id", user.id)
        .eq("following_id", profileId);
      if (error) {
        console.error("error");
        throw error;
      }
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
};


export const updateProfilePicture = async (
  supabase: SupabaseClient,
  user: User,
  file: File | null
): Promise<void> => {
  try {
    if (file) {
      const { error, data: fileData } = await supabase.storage
        .from("avatars")
        .upload(`avatars/${user.id}`, file, {
          upsert: true,
        });
      if (error || !fileData) {
        console.error("error");
        throw error;
      }
      const { error: errors } = await supabase
        .from("profile")
        .update([{ avatar_url: fileData.path }])
        .eq("id", user.id);
      if (errors) {
        console.error("error");
        throw error;
      }
    } else if (!file) {
      const { error } = await supabase.storage
        .from("avatars")
        .remove([`avatars/${user.id}`]);
      const { error: errors } = await supabase
        .from("profile")
        .update([{ avatar_url: null }])
        .eq("id", user.id);
      if (errors || errors) {
        console.error("error");
        throw error;
      }
      if (error) {
        console.error("error");
        throw error;
      }
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
};



import { SupabaseClient, User } from "@supabase/supabase-js";
import { Post } from "../models/post";
import { z } from "zod";


export const getPost = async (
  supabase: SupabaseClient,
  user: User,
  postId: string
): Promise<z.infer<typeof Post>> => {
  try {
    const { error, data } = await supabase
      .from("post")
      .select(`*,author:profile!post_author_id_fkey(*), likes:like(*)`)
      .eq("id", postId)
      .single();
    if (error) {
      console.error(error);
      throw error;
    }
    if (error) {
      console.error(error);
      throw error;
    }
    return Post.parse(data);
  } catch (error) {
    console.error("Error fetching feed:", error);
    throw error;
  }
};


export const getFeed = async (
  supabase: SupabaseClient,
  user: User,
  cursor: number
): Promise<z.infer<typeof Post>[]> => {
  try {
    const { error, data } = await supabase
      .from("post")
      .select(`*,author:profile!post_author_id_fkey(*), likes:like(*)`)
      .order("posted_at", { ascending: false })
      .range(cursor, cursor + 24);

    if (error) {
      console.error(error);
      throw error;
    }
    const parsedData = Post.array().parse(data);

    return parsedData;
  } catch (error) {
    console.error("Error fetching feed:", error);
    throw error;
  }
};


export const getFollowingFeed = async (
  supabase: SupabaseClient,
  user: User,
  cursor: number
): Promise<z.infer<typeof Post>[]> => {
  try {
    const { data: authId } = await supabase
      .from("follow")
      .select("following_id")
      .eq("follower_id", user.id);
    if (!authId) {
      throw new Error("No following IDs found.");
    }
    const authIdString = authId.map((authId) => authId.following_id);
    const { error, data } = await supabase
      .from("post")
      .select(`*,author:profile!post_author_id_fkey(*), likes:like(*)`)
      .in("author_id", authIdString)
      .order("posted_at", { ascending: false })
      .range(cursor, cursor + 24);

    if (error) {
      console.error(error);
      throw error;
    }
    return Post.array().parse(data);
  } catch (error) {
    console.error("Error fetching feed:", error);
    throw error;
  }
};


export const getLikesFeed = async (
  supabase: SupabaseClient,
  user: User,
  cursor: number
): Promise<z.infer<typeof Post>[]> => {
  try {
    const { data: ids } = await supabase
      .from("like")
      .select("post_id")
      .eq("profile_id", user.id);
    if (!ids) {
      throw new Error("No following IDs found.");
    }
    const idsString = ids.map((ids) => ids.post_id).toString();
    const { error, data } = await supabase
      .from("post")
      .select(`*,author:profile!post_author_id_fkey(*), likes:like(*)`)
      .in("id", idsString.split(","))
      .order("posted_at", { ascending: false })
      .range(cursor, cursor + 24);

    if (error) {
      console.error(error);
      throw error;
    }
    return Post.array().parse(data);
  } catch (error) {
    console.error("Error fetching feed:", error);
    throw error;
  }
};


export const toggleLike = async (
  supabase: SupabaseClient,
  user: User,
  postId: string
): Promise<void> => {
  try {
    const { data: like, error } = await supabase
      .from("like")
      .select("*")
      .eq("profile_id", user.id)
      .eq("post_id", postId);
    if (Array.isArray(like) && like.length > 0) {
      const {} = await supabase
        .from("like")
        .delete()
        .eq("profile_id", user.id)
        .eq("post_id", postId);
    } else {
      const {} = await supabase
        .from("like")
        .insert([{ profile_id: user.id, post_id: postId }])
        .eq("profile_id", user.id)
        .eq("post_id", postId);
    }
    if (error) {
      console.error(error);
      throw error;
    }
  } catch (error) {
    console.error("Error fetching feed:", error);
    throw error;
  }
};


export const createPost = async (
  supabase: SupabaseClient,
  user: User,
  content: string,
  file: File | null
): Promise<void> => {
  try {
    const { data: postData, error } = await supabase
      .from("post")
      .insert([{ content: content, author_id: user.id, attachment_url: file }])
      .select("id");
    if (!postData || postData.length === 0) {
      throw new Error("Post creation failed. No data returned.");
    }
    const postId = postData[0].id;
    if (file) {
      const { data: fileData, error } = await supabase.storage
        .from("images")
        .upload(`images/${postId}`, file, {
          upsert: true,
        });
      const {} = await supabase
        .from("post")
        .update([{ attachment_url: fileData?.path }])
        .eq("id", postId);
      if (error) {
        console.error(error);
        throw error;
      }
    }
    if (error) {
      console.error(error);
      throw error;
    }
  } catch (error) {
    console.error("Error fetching feed:", error);
    throw error;
  }
};

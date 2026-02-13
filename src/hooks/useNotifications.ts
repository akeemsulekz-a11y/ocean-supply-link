import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  target_roles: string[];
  reference_id: string | null;
  read_by: string[];
  created_at: string;
}

export const useNotifications = () => {
  const { user, role } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data as Notification[]);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    // Real-time subscription
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        const newNotif = payload.new as Notification;
        setNotifications(prev => [newNotif, ...prev].slice(0, 20));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

  const myRole = role ?? "customer";
  const unread = notifications.filter(n => 
    n.target_roles.includes(myRole) && !n.read_by.includes(user?.id ?? "")
  );

  const markAsRead = async (id: string) => {
    if (!user) return;
    const notif = notifications.find(n => n.id === id);
    if (!notif) return;
    const newReadBy = [...notif.read_by, user.id];
    await supabase.from("notifications").update({ read_by: newReadBy }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_by: newReadBy } : n));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    for (const n of unread) {
      await supabase.from("notifications").update({ read_by: [...n.read_by, user.id] }).eq("id", n.id);
    }
    setNotifications(prev => prev.map(n => ({
      ...n,
      read_by: n.target_roles.includes(myRole) ? [...n.read_by, user.id] : n.read_by,
    })));
  };

  return { notifications, unread, markAsRead, markAllAsRead };
};

export const sendNotification = async (data: {
  type: string;
  title: string;
  message: string;
  target_roles: string[];
  reference_id?: string;
}) => {
  await supabase.from("notifications").insert({
    type: data.type,
    title: data.title,
    message: data.message,
    target_roles: data.target_roles,
    reference_id: data.reference_id ?? null,
  });
};

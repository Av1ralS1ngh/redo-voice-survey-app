'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';

interface Project {
  id: string;
  name: string;
  description: string;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchUserAndProjects = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, description')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching projects:', error);
        } else {
          console.log('Dashboard - Fetched projects:', data?.map(p => ({ id: p.id, name: p.name })));
          setProjects(data || []);
        }
      }
      setLoading(false);
    };

    fetchUserAndProjects();
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'var(--page-bg)',
        color: 'var(--foreground)'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8" style={{
      background: 'var(--page-bg)',
      color: 'var(--foreground)'
    }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" style={{
          background: 'linear-gradient(to right, rgba(59, 130, 246, 0.2), transparent)'
        }}></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-1000" style={{
          background: 'linear-gradient(to left, rgba(147, 51, 234, 0.2), transparent)'
        }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-2000" style={{
          background: 'linear-gradient(to right, rgba(236, 72, 153, 0.2), transparent)'
        }}></div>
      </div>
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: 'var(--foreground)' }}>Your Interviews</h1>
          <Link
            href="/interviews/create"
            className="inline-block px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-blue-400/50 text-lg"
          >
            Add Interview
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20 backdrop-blur-md rounded-2xl shadow-lg" style={{
            background: 'var(--card-bg)',
            color: 'var(--foreground)'
          }}>
            <p className="mb-4 text-xl" style={{ color: 'var(--foreground)', opacity: 0.7 }}>You have no projects yet.</p>
            <p style={{ color: 'var(--foreground)', opacity: 0.5 }}>Click "Add Project" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => (
              <Link href={`/projects/${project.id}`} key={project.id}>
                <div className="backdrop-blur-md p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col justify-between transform hover:-translate-y-1" style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)'
                }}>
                  <div>
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>{project.name}</h2>
                    <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>{project.description || 'No description'}</p>
                  </div>
                  <div className="text-xs mt-4" style={{ color: 'var(--foreground)', opacity: 0.5 }}>Survey Builder</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

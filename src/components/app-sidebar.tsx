'use client'

import * as React from 'react'
import {
  Clapperboard,
  Blocks,
  Calendar,
  Tv,
  MessageCircleQuestion,
  Settings2,
  Sparkles,
  Gamepad2,
  Trash2,
  Video,
  TvMinimal,
  TvMinimalPlay,
  CassetteTape,
  ListVideo,
  Bookmark,
} from 'lucide-react'

import { NavMain } from '@/components/nav-main'
import { NavSecondary } from '@/components/nav-secondary'
import { TeamSwitcher } from '@/components/team-switcher'
import { Sidebar, SidebarContent, SidebarHeader, SidebarRail } from '@/components/ui/sidebar'

const data = {
  teams: [
    {
      name: 'IMDb',
      logo: Clapperboard,
    },
  ],
  navMain: [
    {
      title: 'Movies',
      url: '/imdb?type=movie',
      icon: Clapperboard,
    },
    {
      title: 'TV Series',
      url: '/imdb?type=tvSeries',
      icon: ListVideo,
    },
    {
      title: 'TV Mini Series',
      url: '/imdb?type=tvMiniSeries',
      icon: Tv,
    },
    {
      title: 'TV Special',
      url: '/imdb?type=tvSpecial',
      icon: TvMinimalPlay,
    },
    {
      title: 'TV Movie',
      url: '/imdb?type=tvMovie',
      icon: CassetteTape,
    },
    {
      title: 'Short',
      url: '/imdb?type=short',
      icon: TvMinimal,
    },
    {
      title: 'Video',
      url: '/imdb?type=video',
      icon: Video,
    },
    {
      title: 'Video Game',
      url: '/imdb?type=videoGame',
      icon: Gamepad2,
    },
  ],
  navSecondary: [
    {
      title: 'My Watchlist',
      url: '/imdb/watchlist',
      icon: Bookmark,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarContent>
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

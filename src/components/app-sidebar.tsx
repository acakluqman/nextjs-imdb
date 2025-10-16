'use client'

import {
  Bookmark,
  CassetteTape,
  Clapperboard,
  Gamepad2,
  ListVideo,
  Tv,
  TvMinimal,
  TvMinimalPlay,
  Video,
} from 'lucide-react'
import * as React from 'react'

import Metadata from '@/app/layout'
import { NavMain } from '@/components/nav-main'
import {
  Sidebar,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const data = {
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Clapperboard className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">IMDb</span>
                  <span className="text-xs text-sidebar-foreground dark:text-sidebar-primary-foreground/70">
                    v1.0.0
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarRail />
    </Sidebar>
  )
}

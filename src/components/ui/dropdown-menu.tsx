import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { cn } from "@/lib/utils"
import { ChevronRightIcon, CheckIcon } from "lucide-react"

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
}

function DropdownMenuTrigger({
  nativeButton,
  render,
  ...props
}: MenuPrimitive.Trigger.Props) {
  return (
    <MenuPrimitive.Trigger 
      data-slot="dropdown-menu-trigger" 
      nativeButton={nativeButton ?? true}
      render={render}
      {...props} 
    />
  )
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "z-50 max-h-(--available-height) w-(--anchor-width) min-w-32 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-black/95 backdrop-blur-xl border border-white/10 p-1 text-white shadow-md duration-100 outline-none",
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

// FIXED: DropdownMenuGroup - This was causing the error
function DropdownMenuGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      data-slot="dropdown-menu-group" 
      className={cn("flex flex-col gap-1", className)} 
      {...props} 
    />
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  inset?: boolean
}) {
  return (
    <div
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-2 py-1.5 text-xs font-medium text-muted-foreground",
        inset && "pl-7",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  nativeButton,
  render,
  onClick,
  children,
  ...props
}: MenuPrimitive.Item.Props & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none transition-colors select-none",
        "hover:bg-white/10 focus:bg-white/10",
        variant === "destructive" && "text-red-500 hover:bg-red-500/10",
        inset && "pl-7",
        className
      )}
      nativeButton={nativeButton ?? false}
      render={render}
      onClick={onClick}
      {...props}
    >
      {children}
    </MenuPrimitive.Item>
  )
}

function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none hover:bg-white/10 focus:bg-white/10",
        inset && "pl-7",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto h-4 w-4" />
    </MenuPrimitive.SubmenuTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      className={cn("min-w-32", className)}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: MenuPrimitive.CheckboxItem.Props) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-md py-1.5 pr-8 pl-7 text-sm outline-none select-none hover:bg-white/10 focus:bg-white/10",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon className="h-4 w-4" />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-md py-1.5 pr-8 pl-7 text-sm outline-none select-none hover:bg-white/10 focus:bg-white/10",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <MenuPrimitive.RadioItemIndicator>
          <CheckIcon className="h-4 w-4" />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-white/10", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
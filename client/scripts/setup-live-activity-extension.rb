#!/usr/bin/env ruby
# frozen_string_literal: true

# Adds a WidgetKit Live Activity extension to the Capacitor iOS Xcode project.
# Run on macOS after `npx cap add ios && npx cap sync ios`:
#   gem install xcodeproj
#   ruby scripts/setup-live-activity-extension.rb

require 'fileutils'
require 'xcodeproj'

ROOT = File.expand_path('..', __dir__)
IOS_APP = File.join(ROOT, 'ios', 'App')
PROJECT_PATH = File.join(IOS_APP, 'App.xcodeproj')
SRC_DIR = File.join(ROOT, 'native', 'ios-live-activity')
EXT_NAME = 'TrackFitLiveActivity'
EXT_DIR = File.join(IOS_APP, EXT_NAME)
BUNDLE_ID = 'com.personal.trackfit.TrackFitLiveActivity'
MAIN_PLIST = File.join(IOS_APP, 'App', 'Info.plist')

abort("[live-activity] Missing Xcode project at #{PROJECT_PATH}") unless File.exist?(PROJECT_PATH)
abort("[live-activity] Missing sources at #{SRC_DIR}") unless Dir.exist?(SRC_DIR)

FileUtils.mkdir_p(EXT_DIR)

%w[
  GenericAttributes.swift
  TrackFitLiveActivityWidget.swift
  TrackFitLiveActivityBundle.swift
  Info.plist
  TrackFitLiveActivity.entitlements
].each do |name|
  src = File.join(SRC_DIR, name)
  abort("[live-activity] Missing #{src}") unless File.exist?(src)
  FileUtils.cp(src, File.join(EXT_DIR, name))
end

# Ensure main app advertises Live Activities.
system('/usr/libexec/PlistBuddy', '-c', 'Delete :NSSupportsLiveActivities', MAIN_PLIST, out: File::NULL, err: File::NULL)
system('/usr/libexec/PlistBuddy', '-c', 'Add :NSSupportsLiveActivities bool true', MAIN_PLIST)
puts '[live-activity] NSSupportsLiveActivities=true'

project = Xcodeproj::Project.open(PROJECT_PATH)
app_target = project.targets.find { |t| t.name == 'App' }
abort('[live-activity] Could not find App target') unless app_target

# Idempotent: remove a previous extension target with the same name.
if (old = project.targets.find { |t| t.name == EXT_NAME })
  old.remove_from_project
  puts "[live-activity] Removed existing #{EXT_NAME} target"
end

ext_target = project.new_target(:app_extension, EXT_NAME, :ios, '16.2')
ext_target.product_type = 'com.apple.product-type.app-extension'

# Build settings
configs = %w[Debug Release]
configs.each do |config_name|
  cfg = ext_target.build_configurations.find { |c| c.name == config_name }
  next unless cfg

  cfg.build_settings['INFOPLIST_FILE'] = "#{EXT_NAME}/Info.plist"
  cfg.build_settings['CODE_SIGN_ENTITLEMENTS'] = "#{EXT_NAME}/TrackFitLiveActivity.entitlements"
  cfg.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = BUNDLE_ID
  cfg.build_settings['TARGETED_DEVICE_FAMILY'] = '1,2'
  cfg.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '16.2'
  cfg.build_settings['GENERATE_INFOPLIST_FILE'] = 'NO'
  cfg.build_settings['SWIFT_VERSION'] = '5.0'
  cfg.build_settings['LD_RUNPATH_SEARCH_PATHS'] = '$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks'
  cfg.build_settings['SKIP_INSTALL'] = 'YES'
  cfg.build_settings['CODE_SIGN_STYLE'] = 'Automatic'
  cfg.build_settings['APPLICATION_EXTENSION_API_ONLY'] = 'YES'
  cfg.build_settings['PRODUCT_NAME'] = EXT_NAME
end

# Also bump main app deployment target if needed and ensure Live Activities capability plist key only.
app_target.build_configurations.each do |cfg|
  current = cfg.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
  if current.nil? || Gem::Version.new(current.to_s) < Gem::Version.new('16.2')
    cfg.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '16.2'
  end
end

group = project.main_group.find_subpath(EXT_NAME, true)
group.set_source_tree('SOURCE_ROOT')
group.set_path(EXT_NAME)

swift_files = %w[
  GenericAttributes.swift
  TrackFitLiveActivityWidget.swift
  TrackFitLiveActivityBundle.swift
]
swift_files.each do |name|
  ref = group.new_file(File.join(EXT_NAME, name))
  ext_target.add_file_references([ref])
end

plist_ref = group.new_file(File.join(EXT_NAME, 'Info.plist'))
ent_ref = group.new_file(File.join(EXT_NAME, 'TrackFitLiveActivity.entitlements'))
# Keep refs in the project even if not compiled.
plist_ref
ent_ref

# Embed the appex into the host app.
embed = app_target.copy_files_build_phases.find { |p| p.name == 'Embed Foundation Extensions' }
unless embed
  embed = project.new(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase)
  embed.name = 'Embed Foundation Extensions'
  embed.symbol_dst_subfolder_spec = '13' # PlugIns
  app_target.build_phases << embed
end

product_ref = ext_target.product_reference
embed.add_file_reference(product_ref)
embed.build_file(product_ref).settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }

# Ensure App depends on the extension build.
app_target.add_dependency(ext_target)

project.save
puts "[live-activity] Added #{EXT_NAME} Widget Extension (#{BUNDLE_ID})"
puts '[live-activity] Open Xcode once if signing asks for a team, then install on your iPhone 17.'

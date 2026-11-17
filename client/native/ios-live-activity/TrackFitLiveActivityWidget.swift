import ActivityKit
import SwiftUI
import WidgetKit

/// Live Activity UI for TrackFit rest timers (Lock Screen + Dynamic Island).
/// Uses `endsAt` / `endsAtEpoch` from the Capacitor Live Activity plugin so the
/// countdown keeps running while the app is backgrounded.
struct TrackFitLiveActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: GenericAttributes.self) { context in
      lockScreenView(context: context)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Text("Rest")
            .font(.headline)
        }
        DynamicIslandExpandedRegion(.trailing) {
          countdownText(context: context)
            .font(.headline.monospacedDigit())
        }
        DynamicIslandExpandedRegion(.bottom) {
          Text(context.state.values["message"] ?? "Recovering…")
            .font(.caption)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
      } compactLeading: {
        Image(systemName: "timer")
      } compactTrailing: {
        countdownText(context: context)
          .font(.caption.monospacedDigit())
      } minimal: {
        Image(systemName: "timer")
      }
    }
  }

  @ViewBuilder
  private func lockScreenView(context: ActivityViewContext<GenericAttributes>) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack {
        Text(context.state.values["title"] ?? "Rest")
          .font(.headline)
        Spacer()
        countdownText(context: context)
          .font(.title2.monospacedDigit().weight(.semibold))
      }
      Text(context.state.values["message"] ?? "")
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .padding()
  }

  @ViewBuilder
  private func countdownText(context: ActivityViewContext<GenericAttributes>) -> some View {
    if let end = endDate(from: context.state.values) {
      Text(timerInterval: Date.now...end, countsDown: true)
    } else {
      Text(context.state.values["status"] ?? "--:--")
    }
  }

  private func endDate(from values: [String: String]) -> Date? {
    if let iso = values["endsAt"] {
      let formatter = ISO8601DateFormatter()
      formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
      if let date = formatter.date(from: iso) { return date }
      formatter.formatOptions = [.withInternetDateTime]
      if let date = formatter.date(from: iso) { return date }
    }
    if let epoch = values["endsAtEpoch"], let seconds = TimeInterval(epoch) {
      return Date(timeIntervalSince1970: seconds)
    }
    return nil
  }
}

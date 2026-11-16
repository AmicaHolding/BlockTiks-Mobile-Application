import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_button.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/modules/payment_page/views/payment_page_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

/// Sahra creator door-mode rule: anything that builds or edits an event
/// (creation, tiers, seat maps, promos, payouts, full analytics, teams)
/// hands off to Sahra Studio on the web. Mobile stays a fast event-day tool.
class WebHandoffSheet {
  /// Sahra Studio web app. Update when the studio domain is finalized.
  static const String studioUrl = 'https://sahra.app/studio';

  static void show({required String feature, String? eventId}) {
    Get.bottomSheet(
      Container(
        decoration: BoxDecoration(
          color: ColorConstant.nightSurface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: getPadding(left: 24, right: 24, top: 28, bottom: 32),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: ColorConstant.nightBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                '$feature lives on Sahra Studio',
                style: GoogleFonts.bricolageGrotesque(
                  color: ColorConstant.whiteA700,
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'The mobile app is built for event day — scanning, guests and '
                'broadcasts. For $feature, use Sahra Studio on the web.',
                textAlign: TextAlign.center,
                style: GoogleFonts.ibmPlexSansArabic(
                  color: ColorConstant.nightMuted,
                  fontSize: 14,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: PrimaryPillButton(
                  text: 'Open Sahra Studio',
                  onTap: () => launchUrl(Uri.parse(studioUrl),
                      mode: LaunchMode.externalApplication),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: CustomButton(
                  text: 'Copy studio link',
                  variant: ButtonVariant.OutlineWhite,
                  onTap: () async {
                    await Clipboard.setData(
                        const ClipboardData(text: studioUrl));
                    Get.back();
                    CustomSnackBar.showCustomToast(
                        message: 'Studio link copied');
                  },
                ),
              ),
            ],
          ),
        ),
      ),
      isScrollControlled: true,
    );
  }
}

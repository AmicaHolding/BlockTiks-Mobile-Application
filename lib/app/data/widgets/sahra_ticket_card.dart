import 'package:block_tix/app/data/core/app_export.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:qr_flutter/qr_flutter.dart';

/// Sahra ticket pass (brand: "the ticket is a promise"). Gold stock, Night
/// logo, dashed perforation with notches, QR on a Sand panel. Used for real
/// tickets only, order confirmation and the Tickets tab.
class SahraTicketCard extends StatelessWidget {
  const SahraTicketCard({
    super.key,
    required this.title,
    this.subtitle,
    this.fields = const {},
    this.code,
    this.qrData,
    this.status,
    this.onTap,
  });

  final String title;
  final String? subtitle;

  /// Label → value pairs shown in the info grid (e.g. Zone, Gate, Order).
  final Map<String, String> fields;
  final String? code;

  /// Payload encoded in the gate QR. Falls back to [code] when omitted.
  final String? qrData;
  final String? status;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: ColorConstant.gold,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: getPadding(left: 22, right: 22, top: 22, bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CustomImageView(
                    imagePath: ImageConstant.logoNight,
                    width: 76,
                    fit: BoxFit.fitWidth,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    title,
                    style: GoogleFonts.bricolageGrotesque(
                      color: ColorConstant.night,
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      height: 1.2,
                    ),
                  ),
                  if (subtitle != null && subtitle!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      style: GoogleFonts.bricolageGrotesque(
                        color: ColorConstant.night.withValues(alpha: 0.7),
                        fontSize: 13,
                      ),
                    ),
                  ],
                  if (fields.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Row(
                      children: fields.entries
                          .take(4)
                          .map((e) => Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      e.key,
                                      style: GoogleFonts.bricolageGrotesque(
                                        color: ColorConstant.night
                                            .withValues(alpha: 0.6),
                                        fontSize: 11,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      e.value,
                                      style: GoogleFonts.bricolageGrotesque(
                                        color: ColorConstant.night,
                                        fontSize: 17,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ),
                              ))
                          .toList(),
                    ),
                  ],
                  if ((code != null && code!.isNotEmpty) ||
                      (status != null && status!.isNotEmpty)) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        if (code != null && code!.isNotEmpty)
                          Text(
                            'Code: $code',
                            style: GoogleFonts.bricolageGrotesque(
                              color: ColorConstant.night,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        if (status != null && status!.isNotEmpty) ...[
                          const SizedBox(width: 10),
                          Text(
                            'Status: $status',
                            style: GoogleFonts.bricolageGrotesque(
                              color: ColorConstant.night.withValues(alpha: 0.6),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ],
              ),
            ),
            // Perforation: dashed rule with ticket notches on each side.
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  margin: getMargin(left: 20, right: 20),
                  height: 0,
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(
                        color: ColorConstant.night.withValues(alpha: 0.33),
                        width: 2,
                        style: BorderStyle.solid,
                      ),
                    ),
                  ),
                ),
                // Notch circles punched out of the card edges.
                Positioned(
                  left: -34,
                  top: -14,
                  child: Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: ColorConstant.night,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                Positioned(
                  right: -34,
                  top: -14,
                  child: Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: ColorConstant.night,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ],
            ),
            Container(
              width: double.infinity,
              margin: getMargin(top: 20),
              padding: getPadding(all: 22),
              decoration: BoxDecoration(
                color: ColorConstant.sand,
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(24),
                  bottomRight: Radius.circular(24),
                ),
              ),
              child: Column(
                children: [
                  Container(
                    width: 150,
                    height: 150,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: ColorConstant.sand,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: ColorConstant.dune),
                    ),
                    child: _qrPanel(),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Screen brightens automatically at the gate',
                    style: GoogleFonts.bricolageGrotesque(
                      color: ColorConstant.ink.withValues(alpha: 0.6),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _qrPanel() {
    final data = (qrData != null && qrData!.isNotEmpty)
        ? qrData!
        : (code != null && code!.isNotEmpty ? code! : 'Sahra ticket');
    return QrImageView(
      data: data,
      version: QrVersions.auto,
      size: 130,
      backgroundColor: ColorConstant.sand,
      eyeStyle: QrEyeStyle(
        eyeShape: QrEyeShape.square,
        color: ColorConstant.ink,
      ),
      dataModuleStyle: QrDataModuleStyle(
        dataModuleShape: QrDataModuleShape.square,
        color: ColorConstant.ink,
      ),
    );
  }
}

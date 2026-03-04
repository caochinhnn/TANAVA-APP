import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export const generateDeliveryNote = async (order) => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // Fetch Vietnamese font from local public directory
    const fontUrl = '/fonts/Roboto-Regular.ttf';
    const fontBoldUrl = '/fonts/Roboto-Bold.ttf';
    const logoUrl = '/logo.png';

    const fontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
    const fontBoldBytes = await fetch(fontBoldUrl).then(res => res.arrayBuffer());
    const logoBytes = await fetch(logoUrl).then(res => res.arrayBuffer());

    const regularFont = await pdfDoc.embedFont(fontBytes);
    const boldFont = await pdfDoc.embedFont(fontBoldBytes);
    const logoImage = await pdfDoc.embedPng(logoBytes);

    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();

    const margin = 40;
    let currentY = height - margin;

    // ===== HEADER =====
    // New Logo (Right Side)
    try {
        const logoDims = logoImage.scale(1);
        const aspectRatio = logoDims.width / logoDims.height;
        const targetWidth = 150;
        const targetHeight = targetWidth / aspectRatio;

        page.drawImage(logoImage, {
            x: width - targetWidth - 20, // Move further right (tighter margin)
            y: height - targetHeight + 35, // Pushed way up
            width: targetWidth,
            height: targetHeight
        });
    } catch (e) {
        console.error('Logo draw error:', e);
    }

    // Company Info (Left)
    page.drawText('CÔNG TY TNHH TM DV THỰC PHẨM TÂN NAM VANG', { x: margin, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    page.drawText('Địa chỉ: 25 Nguyễn Duy, Phường 9, Quận 8, Tp Hồ Chí Minh', { x: margin, y: currentY, size: 9, font: regularFont });
    currentY -= 12;
    page.drawText('Xưởng: E15/239E, QL50, Ấp 5, Xã Phong Phú, Huyện Bình Chánh, Tp HCM', { x: margin, y: currentY, size: 9, font: regularFont });
    currentY -= 12;
    page.drawText('MST: 0317426213   SĐT: 096 555 1315', { x: margin, y: currentY, size: 9, font: regularFont });
    currentY -= 12;
    page.drawText('Mail: Tanavafoods@gmail.com', { x: margin, y: currentY, size: 9, font: regularFont });
    currentY -= 12;
    page.drawText('STK: 1030528656 - Vietcombank CN Nam Sài Gòn', { x: margin, y: currentY, size: 9, font: regularFont });

    currentY -= 45; // Increased spacing to move title down

    // Title
    const title = 'PHIẾU GIAO HÀNG';
    const titleWidth = boldFont.widthOfTextAtSize(title, 20);
    page.drawText(title, { x: (width - titleWidth) / 2, y: currentY, size: 20, font: boldFont });

    // Order Code (Right side below Title, above Customer Info)
    const orderCode = `Số phiếu: ${order.order_code}`;
    const codeWidth = boldFont.widthOfTextAtSize(orderCode, 10);
    page.drawText(orderCode, { x: width - margin - codeWidth, y: currentY - 15, size: 10, font: boldFont });

    currentY -= 40;

    // Customer Info (Left side)
    const c = order.customers || {};
    const infoSize = 9;

    page.drawText(`Khách hàng:  ${c.name || ''}`, { x: margin, y: currentY, size: infoSize, font: boldFont });
    currentY -= 15;
    page.drawText(`Địa chỉ Cty:  ${c.address || ''}`, { x: margin, y: currentY, size: infoSize, font: regularFont });
    currentY -= 15;
    page.drawText(`Địa chi nhận hàng:  ${c.delivery_location || (c.address || 'Như trên')}`, { x: margin, y: currentY, size: infoSize, font: regularFont });
    currentY -= 15;
    page.drawText(`Người nhận:  ${c.receiver || ''}`, { x: margin, y: currentY, size: infoSize, font: regularFont });
    currentY -= 15;
    page.drawText(`Liên hệ:  ${order.delivery_phone || c.phone || ''}`, { x: margin, y: currentY, size: infoSize, font: regularFont });
    currentY -= 15;
    page.drawText(`Thanh toán:  CK`, { x: margin, y: currentY, size: infoSize, font: regularFont });
    currentY -= 20;

    page.drawText('Chúng tôi xin giao các sản phẩm như sau:', { x: margin, y: currentY, size: infoSize, font: regularFont });
    currentY -= 20;

    // ===== BẢNG SẢN PHẨM =====
    const tableHeaders = ['STT', 'TÊN HÀNG', 'ĐVT', 'SL Yêu cầu', 'SL Thực tế', 'ĐƠN GIÁ', 'THÀNH TIỀN'];
    const colWidths = [30, 160, 40, 65, 65, 75, 80];
    const startX = margin;
    const rowHeight = 25;

    // Draw Header
    let currentX = startX;
    const headerRowY = currentY - 18; // Box bottom
    page.drawRectangle({
        x: startX,
        y: headerRowY,
        width: width - 2 * margin,
        height: rowHeight,
        borderWidth: 0.5,
        borderColor: rgb(0, 0, 0)
    });

    tableHeaders.forEach((h, i) => {
        const textWidth = boldFont.widthOfTextAtSize(h, 8);
        const textHeight = 8;
        const yPos = headerRowY + (rowHeight - textHeight) / 2 + 3;
        page.drawText(h, { x: currentX + (colWidths[i] - textWidth) / 2, y: yPos, size: 8, font: boldFont });

        // Vertical line for grid
        if (i < tableHeaders.length - 1) {
            page.drawLine({
                start: { x: currentX + colWidths[i], y: headerRowY },
                end: { x: currentX + colWidths[i], y: headerRowY + rowHeight },
                thickness: 0.5,
                color: rgb(0, 0, 0)
            });
        }
        currentX += colWidths[i];
    });

    currentY -= rowHeight;

    // Draw Rows
    const formatNum = (val) => val !== null && val !== undefined ? new Intl.NumberFormat('vi-VN').format(val) : '';

    let hasActualQty = false;
    let grandTotal = 0;

    order.items.forEach((item, index) => {
        currentX = startX;
        const qtyActual = item.quantity_actual;
        const isQtyProvided = qtyActual !== null && qtyActual !== undefined && qtyActual !== 0;

        if (isQtyProvided) hasActualQty = true;
        const rowTotal = isQtyProvided ? item.total_price : null;
        if (rowTotal) grandTotal += rowTotal;

        const rowData = [
            (index + 1).toString(),
            item.products?.name || '',
            item.products?.unit || '',
            formatNum(item.quantity_requested),
            formatNum(qtyActual),
            formatNum(item.unit_price),
            isQtyProvided ? formatNum(rowTotal) : ''
        ];

        const rowBottomY = currentY - 18;
        page.drawRectangle({
            x: startX,
            y: rowBottomY,
            width: width - 2 * margin,
            height: rowHeight,
            borderWidth: 0.5,
            borderColor: rgb(0, 0, 0)
        });

        rowData.forEach((text, i) => {
            const textWidth = regularFont.widthOfTextAtSize(text, 9);
            const textHeight = 9;
            const yPos = rowBottomY + (rowHeight - textHeight) / 2 + 2;
            let textX = currentX;

            // Alignment
            if (i === 0 || i === 2 || i === 3 || i === 4) { // Center STT, ĐVT, Yêu cầu, Thực tế
                textX += (colWidths[i] - textWidth) / 2;
            } else if (i === 1) { // Left-align Tên hàng
                textX += 5;
            } else { // Right-align Price, Total
                textX += colWidths[i] - textWidth - 5;
            }

            page.drawText(text, { x: textX, y: yPos, size: 9, font: regularFont });

            // Vertical line for grid
            if (i < rowData.length - 1) {
                page.drawLine({
                    start: { x: currentX + colWidths[i], y: rowBottomY },
                    end: { x: currentX + colWidths[i], y: rowBottomY + rowHeight },
                    thickness: 0.5,
                    color: rgb(0, 0, 0)
                });
            }

            currentX += colWidths[i];
        });

        currentY -= rowHeight;
    });

    // ===== TỔNG TIỀN =====
    if (hasActualQty) {
        const totalLabel = 'Tổng cộng';
        const totalVal = formatNum(grandTotal);

        const totalRowBottomY = currentY - 18;
        const totalBoxWidth = colWidths[5] + colWidths[6];
        const totalBoxX = startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4];

        // Draw row for total
        page.drawRectangle({
            x: totalBoxX,
            y: totalRowBottomY,
            width: totalBoxWidth,
            height: rowHeight,
            borderWidth: 0.5,
            borderColor: rgb(0, 0, 0)
        });

        // Vertical split line for total box
        page.drawLine({
            start: { x: totalBoxX + colWidths[5], y: totalRowBottomY },
            end: { x: totalBoxX + colWidths[5], y: totalRowBottomY + rowHeight },
            thickness: 0.5,
            color: rgb(0, 0, 0)
        });

        const labelWidth = boldFont.widthOfTextAtSize(totalLabel, 9);
        const yPos = totalRowBottomY + (rowHeight - 9) / 2 + 3;
        page.drawText(totalLabel, { x: totalBoxX + (colWidths[5] - labelWidth) / 2, y: yPos, size: 9, font: boldFont });

        const valWidth = boldFont.widthOfTextAtSize(totalVal, 9);
        page.drawText(totalVal, { x: width - margin - valWidth - 5, y: yPos, size: 9, font: boldFont });

        currentY -= rowHeight;
    }

    // ===== FOOTER =====
    currentY -= 40;
    const orderDate = new Date(order.order_date);
    const day = String(orderDate.getDate()).padStart(2, '0');
    const monthNum = orderDate.getMonth() + 1;
    const month = monthNum <= 2 ? String(monthNum).padStart(2, '0') : String(monthNum);
    const year = orderDate.getFullYear();
    const footerDate = `Ngày ${day} tháng ${month} năm ${year}`;
    const dWidth = boldFont.widthOfTextAtSize(footerDate, 9);
    // Center date above "Người Giao Hàng" (Right half)
    const rightHalfCenter = width - margin - 75;
    page.drawText(footerDate, { x: rightHalfCenter - dWidth / 2, y: currentY, size: 9, font: boldFont });
    currentY -= 30; // Increased spacing

    const labelLeft = 'Người Nhận Hàng';
    const labelRight = 'Người Giao Hàng';
    const rightWidth = boldFont.widthOfTextAtSize(labelRight, 10);

    // Position "Người Nhận Hàng" aligned with the start of the product name column
    const productColumnX = margin + 30; // margin (startX) + colWidths[0] (STT column)
    page.drawText(labelLeft, { x: productColumnX, y: currentY, size: 10, font: boldFont });
    page.drawText(labelRight, { x: rightHalfCenter - rightWidth / 2, y: currentY, size: 10, font: boldFont });

    // Signature below Người Giao Hàng - Removed hardcoded name
    currentY -= 50;

    // Save and Download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PhieuGiaoHang_${order.order_code}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

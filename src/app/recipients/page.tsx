// app/recipients/page.tsx
// Excel upload and recipient management page

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, FileSpreadsheet, Users, AlertCircle, CheckCircle, X } from 'lucide-react';

interface Recipient {
  uid: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  surveyUrl: string;
  shortUrl: string;
}

interface UploadResult {
  success: boolean;
  message: string;
  batchId: string;
  recipients: Recipient[];
  errors?: string[];
  totalProcessed: number;
  totalErrors: number;
}

export default function RecipientsPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  // Handle file selection
  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/recipients/upload', {
        method: 'POST',
        body: formData,
      });

      const result: UploadResult = await response.json();
      setUploadResult(result);
      
      if (result.success) {
        setRecipients(result.recipients);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        message: 'Failed to upload file',
        batchId: '',
        recipients: [],
        totalProcessed: 0,
        totalErrors: 1,
        errors: ['Network error occurred']
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Download recipients
  const downloadRecipients = async (format: 'excel' | 'csv') => {
    try {
      const response = await fetch(`/api/recipients/download?format=${format}`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recipients-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download recipients list');
    }
  };

  // Load existing recipients
  const loadRecipients = async () => {
    setIsLoadingRecipients(true);
    try {
      const response = await fetch('/api/recipients/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 100 })
      });

      const data = await response.json();
      if (data.recipients) {
        setRecipients(data.recipients.map((r: any) => ({
          uid: r.uid,
          name: r.name || '',
          firstName: r.first_name || '',
          lastName: r.last_name || '',
          email: r.email,
          surveyUrl: r.full_survey_url,
          shortUrl: r.tiny_url
        })));
      }
    } catch (error) {
      console.error('Error loading recipients:', error);
    } finally {
      setIsLoadingRecipients(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Recipient Management
          </h1>
          <p className="text-gray-600">
            Upload Excel files with names and emails to create survey recipients
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Upload Excel File
          </h2>
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-600 mb-2">
              Drag and drop your Excel file here
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or click to browse files
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : 'Select File'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* File Requirements */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900">File Requirements:</h3>
              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = '/api/recipients/template';
                  a.download = 'recipients-template.xlsx';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Download Template
              </button>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Excel format (.xlsx or .xls)</li>
              <li>• Must contain "name" and "email" columns</li>
              <li>• First row should be column headers</li>
              <li>• Each row represents one recipient</li>
            </ul>
          </div>
        </div>

        {/* Upload Results */}
        {uploadResult && (
          <div className={`rounded-lg p-6 mb-8 ${
            uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start">
              {uploadResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
              )}
              <div className="flex-1">
                <h3 className={`font-semibold ${
                  uploadResult.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {uploadResult.success ? 'Upload Successful!' : 'Upload Failed'}
                </h3>
                <p className={`mt-1 ${
                  uploadResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {uploadResult.message}
                </p>
                
                {uploadResult.success && (
                  <div className="mt-3 text-sm text-green-700">
                    <p>• Processed: {uploadResult.totalProcessed} recipients</p>
                    <p>• Batch ID: {uploadResult.batchId}</p>
                  </div>
                )}

                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-semibold text-red-900 mb-2">Errors:</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {uploadResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <button
                onClick={() => setUploadResult(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Recipients List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Recipients List
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() => loadRecipients()}
                disabled={isLoadingRecipients}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {isLoadingRecipients ? 'Loading...' : 'Load Recipients'}
              </button>
              <button
                onClick={() => downloadRecipients('excel')}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Excel
              </button>
              <button
                onClick={() => downloadRecipients('csv')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </button>
            </div>
          </div>

          {recipients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      First Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Survey URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Short URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recipients.map((recipient) => (
                    <tr key={recipient.uid}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {recipient.firstName || recipient.name?.split(' ')[0] || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {recipient.lastName || recipient.name?.split(' ').slice(1).join(' ') || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {recipient.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <a 
                          href={recipient.surveyUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 break-all"
                        >
                          {recipient.surveyUrl}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <a 
                          href={recipient.shortUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800"
                        >
                          {recipient.shortUrl}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => navigator.clipboard.writeText(recipient.shortUrl)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Copy Short URL
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recipients uploaded yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Upload an Excel file to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
